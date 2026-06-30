"use client";

import {
	AlertCircleIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	PackageSearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AddressFormDialog } from "~/app/checkout/_components/address-form-dialog";
import { PaymentMethodFormDialog } from "~/app/checkout/_components/payment-method-form-dialog";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import type {
	CheckoutAddress,
	CheckoutPaymentMethod,
	CheckoutPaymentResult,
	CheckoutState,
} from "~/shared/common/checkout.types";
import { selectCartSnapshot, useCartStore } from "~/store/cart-store";
import { useCartUiStore } from "~/store/cart-ui-store";
import { api } from "~/trpc/react";
import { CheckoutAddressStep } from "./checkout-address-step";
import { CheckoutOrderStep } from "./checkout-order-step";
import { CheckoutPaymentStep } from "./checkout-payment-step";
import { CheckoutResultPanel } from "./checkout-result-panel";
import { CheckoutReviewStep } from "./checkout-review-step";
import { CheckoutStepper } from "./checkout-stepper";
import {
	CHECKOUT_STEPS,
	type CheckoutSelection,
	type CheckoutStepId,
	canConfirm,
	isStepReachable,
	nextStep,
	prevStep,
} from "./checkout-steps";
import { CheckoutMobileBar, CheckoutSummary } from "./checkout-summary";

function CheckoutLoadingState() {
	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
			<Skeleton className="h-24 w-full rounded-4xl" />
			<div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
				<Skeleton className="h-96 w-full rounded-4xl" />
				<Skeleton className="h-80 w-full rounded-4xl" />
			</div>
		</main>
	);
}

export function CheckoutClient() {
	const hasHydrated = useCartStore((state) => state.hasHydrated);
	const items = useCartStore((state) => state.items);
	const serverCartCode = useCartStore((state) => state.serverCartCode);
	const serverCartId = useCartStore((state) => state.serverCartId);
	const serverCartStatus = useCartStore((state) => state.serverCartStatus);
	const clearCart = useCartStore((state) => state.clear);
	const openMiniCart = useCartUiStore((state) => state.openMiniCart);

	// Drive items/summary off the LIVE cart store (single bootstrap lives in the
	// navbar's CartNavButton). This stays consistent with what confirmAndPay
	// re-reads server-side, so mini-cart edits reflect instantly here.
	const liveCart = useMemo(
		() =>
			selectCartSnapshot({
				items,
				serverCartCode,
				serverCartId,
				serverCartStatus,
			}),
		[items, serverCartCode, serverCartId, serverCartStatus],
	);

	const [checkout, setCheckout] = useState<CheckoutState | null>(null);
	const [currentStep, setCurrentStep] = useState<CheckoutStepId>("order");
	const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
		null,
	);
	const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
		number | null
	>(null);
	const [addressDialogOpen, setAddressDialogOpen] = useState(false);
	const [editingAddress, setEditingAddress] = useState<CheckoutAddress | null>(
		null,
	);
	const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
	const [editingPaymentMethod, setEditingPaymentMethod] =
		useState<CheckoutPaymentMethod | null>(null);
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [summarySheetOpen, setSummarySheetOpen] = useState(false);
	const [paymentAttemptKey, setPaymentAttemptKey] = useState(() =>
		crypto.randomUUID(),
	);
	const [result, setResult] = useState<CheckoutPaymentResult | null>(null);
	const startRequested = useRef(false);
	const utils = api.useUtils();

	const applyCheckoutState = (nextCheckout: CheckoutState) => {
		setCheckout(nextCheckout);
		setSelectedAddressId(
			(current) => current ?? nextCheckout.addresses[0]?.id ?? null,
		);
		setSelectedPaymentMethodId(
			(current) => current ?? nextCheckout.paymentMethods[0]?.id ?? null,
		);
	};

	const startCheckout = api.checkout.start.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo iniciar checkout");
		},
		onSuccess: applyCheckoutState,
	});

	useEffect(() => {
		if (startRequested.current) return;
		if (!hasHydrated) return;

		startRequested.current = true;
		startCheckout.mutate();
	}, [hasHydrated, startCheckout]);

	const createAddress = api.checkout.createAddress.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo guardar la dirección");
		},
		onSuccess(address) {
			setCheckout((current) =>
				current
					? {
							...current,
							addresses: [
								address,
								...current.addresses.filter((item) => item.id !== address.id),
							],
						}
					: current,
			);
			setSelectedAddressId(address.id);
			setAddressDialogOpen(false);
			toast.success("Dirección guardada");
		},
	});

	const updateAddress = api.checkout.updateAddress.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo actualizar la dirección");
		},
		onSuccess(address) {
			setCheckout((current) =>
				current
					? {
							...current,
							addresses: current.addresses.map((item) =>
								item.id === address.id ? address : item,
							),
						}
					: current,
			);
			setSelectedAddressId(address.id);
			setAddressDialogOpen(false);
			toast.success("Dirección actualizada");
		},
	});

	const createPaymentMethod = api.checkout.createPaymentMethod.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo guardar el método de pago");
		},
		onSuccess(paymentMethod) {
			setCheckout((current) =>
				current
					? {
							...current,
							paymentMethods: [
								paymentMethod,
								...current.paymentMethods.filter(
									(item) => item.id !== paymentMethod.id,
								),
							],
						}
					: current,
			);
			setSelectedPaymentMethodId(paymentMethod.id);
			setPaymentDialogOpen(false);
			toast.success("Método de pago guardado");
		},
	});

	const updatePaymentMethod = api.checkout.updatePaymentMethod.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo actualizar el método de pago");
		},
		onSuccess(paymentMethod) {
			setCheckout((current) =>
				current
					? {
							...current,
							paymentMethods: current.paymentMethods.map((item) =>
								item.id === paymentMethod.id ? paymentMethod : item,
							),
						}
					: current,
			);
			setSelectedPaymentMethodId(paymentMethod.id);
			setPaymentDialogOpen(false);
			toast.success("Método de pago actualizado");
		},
	});

	const confirmAndPay = api.checkout.confirmAndPay.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo confirmar el pago");
		},
		async onSuccess(output) {
			if (output.redirectUrl) {
				toast.message("Redirigiendo a Mercado Pago");
				window.location.assign(output.redirectUrl);
				return;
			}

			setResult(output);
			if (output.status === "succeeded") {
				clearCart();
				toast.success("Compra confirmada");
			} else if (output.status === "failed") {
				toast.error(output.message);
			} else {
				toast.warning(output.message);
			}
			await utils.orders.listMine.invalidate();
		},
	});

	if (result) {
		return (
			<CheckoutResultPanel
				onRetry={() => {
					setResult(null);
					setCurrentStep("review");
					setPaymentAttemptKey(crypto.randomUUID());
				}}
				result={result}
			/>
		);
	}

	if (
		!hasHydrated ||
		startCheckout.isPending ||
		(!checkout && !startCheckout.error)
	) {
		return <CheckoutLoadingState />;
	}

	if (startCheckout.error || !checkout) {
		return (
			<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
				<Alert variant="destructive">
					<AlertCircleIcon />
					<AlertTitle>No se pudo iniciar checkout</AlertTitle>
					<AlertDescription>
						{startCheckout.error?.message ??
							"Revisá tu carrito antes de continuar."}
					</AlertDescription>
				</Alert>
				<div className="flex gap-2">
					<Button asChild variant="outline">
						<Link href="/cart">Volver al carrito</Link>
					</Button>
					<Button asChild>
						<Link href="/products">Ver productos</Link>
					</Button>
				</div>
			</main>
		);
	}

	// Cart emptied mid-checkout (e.g. via the mini-cart) after start() succeeded.
	if (liveCart.items.length === 0) {
		return (
			<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PackageSearchIcon />
						</EmptyMedia>
						<EmptyTitle>Tu carrito está vacío</EmptyTitle>
						<EmptyDescription>
							Quitaste todos los productos. Agregá items para retomar el
							checkout.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<div className="flex gap-2">
							<Button asChild variant="outline">
								<Link href="/cart">Ver carrito</Link>
							</Button>
							<Button asChild>
								<Link href="/products">Ver productos</Link>
							</Button>
						</div>
					</EmptyContent>
				</Empty>
			</main>
		);
	}

	const selectedAddress = checkout.addresses.find(
		(address) => address.id === selectedAddressId,
	);
	const selectedPaymentMethod = checkout.paymentMethods.find(
		(paymentMethod) => paymentMethod.id === selectedPaymentMethodId,
	);
	const addressMutationPending =
		createAddress.isPending || updateAddress.isPending;
	const paymentMutationPending =
		createPaymentMethod.isPending || updatePaymentMethod.isPending;

	const selection: CheckoutSelection = {
		hasItems: liveCart.items.length > 0,
		addressId: selectedAddressId,
		paymentMethodId: selectedPaymentMethodId,
		acceptedTerms,
	};
	const confirmReady = canConfirm(selection);
	const canContinue = nextStep(currentStep, selection) !== null;

	const goToStep = (step: CheckoutStepId) => {
		if (!isStepReachable(step, selection)) return;
		setSummarySheetOpen(false);
		setCurrentStep(step);
	};

	const handleEditCart = () => {
		setSummarySheetOpen(false);
		openMiniCart();
	};

	const handleContinue = () => {
		const next = nextStep(currentStep, selection);
		if (next) goToStep(next);
	};

	const handleBack = () => {
		const previous = prevStep(currentStep);
		if (previous) setCurrentStep(previous);
	};

	const handleConfirm = () => {
		if (!(selectedAddress && selectedPaymentMethod)) return;
		confirmAndPay.mutate({
			acceptedTerms: true,
			idempotencyKey: paymentAttemptKey,
			paymentMethodId: selectedPaymentMethod.id,
			shippingAddressId: selectedAddress.id,
		});
	};

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 pb-28 md:px-6 lg:pb-8">
			<section className="flex flex-col gap-2">
				<span className="text-muted-foreground text-xs uppercase tracking-wide">
					Checkout
				</span>
				<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div className="flex max-w-3xl flex-col gap-2">
						<h1 className="font-heading font-semibold text-3xl tracking-normal">
							Confirmá tu pedido compartido
						</h1>
						<p className="text-muted-foreground text-sm/relaxed">
							Cuatro pasos para dejar tu pedido listo para la agregación
							mayorista.
						</p>
					</div>
					<Button asChild variant="outline">
						<Link href="/cart">
							<ChevronLeftIcon data-icon="inline-start" />
							Volver al carrito
						</Link>
					</Button>
				</div>
			</section>

			<CheckoutStepper
				currentStep={currentStep}
				onStepChange={goToStep}
				selection={selection}
				steps={CHECKOUT_STEPS}
			/>

			<div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
				<section className="flex flex-col gap-4">
					{currentStep === "order" ? (
						<CheckoutOrderStep cart={liveCart} onEditCart={handleEditCart} />
					) : null}

					{currentStep === "shipping" ? (
						<CheckoutAddressStep
							addresses={checkout.addresses}
							onAdd={() => {
								setEditingAddress(null);
								setAddressDialogOpen(true);
							}}
							onEdit={(address) => {
								setEditingAddress(address);
								setAddressDialogOpen(true);
							}}
							onSelect={setSelectedAddressId}
							selectedAddressId={selectedAddressId}
						/>
					) : null}

					{currentStep === "payment" ? (
						<CheckoutPaymentStep
							onAdd={() => {
								setEditingPaymentMethod(null);
								setPaymentDialogOpen(true);
							}}
							onEdit={(paymentMethod) => {
								setEditingPaymentMethod(paymentMethod);
								setPaymentDialogOpen(true);
							}}
							onSelect={setSelectedPaymentMethodId}
							paymentMethods={checkout.paymentMethods}
							selectedPaymentMethodId={selectedPaymentMethodId}
						/>
					) : null}

					{currentStep === "review" &&
					selectedAddress &&
					selectedPaymentMethod ? (
						<CheckoutReviewStep
							acceptedTerms={acceptedTerms}
							cart={liveCart}
							isSubmitting={confirmAndPay.isPending}
							onAcceptedTermsChange={setAcceptedTerms}
							onConfirm={handleConfirm}
							onEditStep={goToStep}
							paymentMethod={selectedPaymentMethod}
							shippingAddress={selectedAddress}
							termsText={checkout.termsText}
						/>
					) : null}

					<div className="hidden justify-between gap-2 lg:flex">
						<Button
							disabled={!prevStep(currentStep)}
							onClick={handleBack}
							type="button"
							variant="outline"
						>
							<ChevronLeftIcon data-icon="inline-start" />
							Atrás
						</Button>
						{currentStep === "review" ? null : (
							<Button
								disabled={!canContinue}
								onClick={handleContinue}
								type="button"
							>
								Continuar
								<ChevronRightIcon data-icon="inline-end" />
							</Button>
						)}
					</div>
				</section>

				<CheckoutSummary
					cart={liveCart}
					className="hidden lg:sticky lg:top-20 lg:block"
					currentStep={currentStep}
					onEditStep={goToStep}
					selectedAddress={selectedAddress}
					selectedPaymentMethod={selectedPaymentMethod}
				/>
			</div>

			<CheckoutMobileBar
				canConfirm={confirmReady}
				canContinue={canContinue}
				cart={liveCart}
				currentStep={currentStep}
				isSubmitting={confirmAndPay.isPending}
				onOpenSummary={() => setSummarySheetOpen(true)}
				onPrimary={currentStep === "review" ? handleConfirm : handleContinue}
			/>

			<Sheet onOpenChange={setSummarySheetOpen} open={summarySheetOpen}>
				<SheetContent className="gap-0" side="bottom">
					<SheetHeader className="sr-only">
						<SheetTitle>Resumen del pedido</SheetTitle>
						<SheetDescription>
							Productos, totales, dirección y pago seleccionados.
						</SheetDescription>
					</SheetHeader>
					<div className="flex-1 overflow-y-auto px-4 py-4">
						<CheckoutSummary
							cart={liveCart}
							currentStep={currentStep}
							onEditStep={goToStep}
							selectedAddress={selectedAddress}
							selectedPaymentMethod={selectedPaymentMethod}
						/>
					</div>
				</SheetContent>
			</Sheet>

			<AddressFormDialog
				address={editingAddress}
				isSubmitting={addressMutationPending}
				onOpenChange={setAddressDialogOpen}
				onSubmit={(values) => {
					if ("id" in values) updateAddress.mutate(values);
					else createAddress.mutate(values);
				}}
				open={addressDialogOpen}
			/>

			<PaymentMethodFormDialog
				isSubmitting={paymentMutationPending}
				onOpenChange={setPaymentDialogOpen}
				onSubmit={(values) => {
					if ("id" in values) updatePaymentMethod.mutate(values);
					else createPaymentMethod.mutate(values);
				}}
				open={paymentDialogOpen}
				paymentMethod={editingPaymentMethod}
			/>
		</main>
	);
}
