"use client";

import {
	AlertCircleIcon,
	CheckCircle2Icon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CreditCardIcon,
	HomeIcon,
	MapPinIcon,
	PackageCheckIcon,
	PencilIcon,
	PlusIcon,
	ReceiptTextIcon,
	ShieldCheckIcon,
	ShoppingBagIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AddressFormDialog } from "~/app/checkout/_components/address-form-dialog";
import { PaymentMethodFormDialog } from "~/app/checkout/_components/payment-method-form-dialog";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { useCartSync } from "~/features/cart/use-cart-sync";
import type {
	CheckoutAddress,
	CheckoutPaymentMethod,
	CheckoutPaymentResult,
	CheckoutState,
} from "~/shared/common/checkout.types";
import {
	formatCurrency,
	formatQuantity,
} from "~/shared/common/commerce.helpers";
import { useCartStore } from "~/store/cart-store";
import { api } from "~/trpc/react";

type CheckoutStep = "address" | "payment" | "review";

const stepItems: Array<{
	id: CheckoutStep;
	label: string;
	Icon: typeof MapPinIcon;
}> = [
	{ id: "address", label: "Dirección", Icon: MapPinIcon },
	{ id: "payment", label: "Pago", Icon: CreditCardIcon },
	{ id: "review", label: "Confirmación", Icon: ReceiptTextIcon },
];

function paymentTypeLabel(type: CheckoutPaymentMethod["type"]) {
	switch (type) {
		case "credit_card":
			return "Tarjeta";
		case "mercadopago":
			return "Mercado Pago";
		case "bank_transfer":
			return "Transferencia";
		case "google_pay":
			return "Google Pay";
		case "cash":
			return "Efectivo";
		default:
			return "Otro";
	}
}

function orderStatusLabel(status: CheckoutPaymentResult["order"]["status"]) {
	switch (status) {
		case "processing":
			return "En procesamiento";
		case "failed":
			return "Fallido";
		case "completed":
			return "Completado";
		case "cancelled":
			return "Cancelado";
		case "refunded":
			return "Reembolsado";
		default:
			return "Pendiente";
	}
}

function CheckoutLoadingState() {
	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
			<Skeleton className="h-24 w-full" />
			<div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
				<Skeleton className="h-96 w-full" />
				<Skeleton className="h-80 w-full" />
			</div>
		</main>
	);
}

function CheckoutStepper({
	currentStep,
	onStepChange,
}: {
	currentStep: CheckoutStep;
	onStepChange: (step: CheckoutStep) => void;
}) {
	return (
		<div className="grid gap-2 sm:grid-cols-3">
			{stepItems.map(({ id, label, Icon }, index) => {
				const active = currentStep === id;

				return (
					<Button
						aria-current={active ? "step" : undefined}
						key={id}
						onClick={() => onStepChange(id)}
						type="button"
						variant={active ? "default" : "outline"}
					>
						<Icon data-icon="inline-start" />
						{index + 1}. {label}
					</Button>
				);
			})}
		</div>
	);
}

function AddressStep({
	addresses,
	selectedAddressId,
	onAdd,
	onEdit,
	onSelect,
}: {
	addresses: CheckoutAddress[];
	selectedAddressId: number | null;
	onAdd: () => void;
	onEdit: (address: CheckoutAddress) => void;
	onSelect: (id: number) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<CardTitle>Dirección de envío</CardTitle>
						<CardDescription>
							Elegí dónde recibir tu parte del pedido mayorista.
						</CardDescription>
					</div>
					<Button onClick={onAdd} type="button" variant="outline">
						<PlusIcon data-icon="inline-start" />
						Nueva
					</Button>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{addresses.length === 0 ? (
					<Empty className="border">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<MapPinIcon />
							</EmptyMedia>
							<EmptyTitle>Sin direcciones guardadas</EmptyTitle>
							<EmptyDescription>
								Agregá una dirección para continuar con el checkout.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button onClick={onAdd} type="button">
								<PlusIcon data-icon="inline-start" />
								Agregar dirección
							</Button>
						</EmptyContent>
					</Empty>
				) : (
					addresses.map((address) => {
						const selected = address.id === selectedAddressId;

						return (
							<div
								className="flex flex-col gap-3 border p-4 md:flex-row md:items-start md:justify-between"
								key={address.id}
							>
								<button
									className="flex flex-1 flex-col gap-1 text-left"
									onClick={() => onSelect(address.id)}
									type="button"
								>
									<span className="flex items-center gap-2 font-medium text-sm">
										{selected ? <CheckCircle2Icon /> : <MapPinIcon />}
										{address.line1}
									</span>
									<span className="text-muted-foreground text-xs/relaxed">
										{address.line2 ? `${address.line2}, ` : ""}
										{address.city}, {address.state} {address.postalCode}
									</span>
									<span className="text-muted-foreground text-xs">
										{address.country}
									</span>
								</button>
								<div className="flex items-center gap-2">
									{selected ? <Badge>Seleccionada</Badge> : null}
									<Button
										onClick={() => onEdit(address)}
										size="sm"
										type="button"
										variant="outline"
									>
										<PencilIcon data-icon="inline-start" />
										Editar
									</Button>
								</div>
							</div>
						);
					})
				)}
			</CardContent>
		</Card>
	);
}

function PaymentStep({
	paymentMethods,
	selectedPaymentMethodId,
	onAdd,
	onEdit,
	onSelect,
}: {
	paymentMethods: CheckoutPaymentMethod[];
	selectedPaymentMethodId: number | null;
	onAdd: () => void;
	onEdit: (paymentMethod: CheckoutPaymentMethod) => void;
	onSelect: (id: number) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<CardTitle>Método de pago</CardTitle>
						<CardDescription>
							El pago se procesa con un proveedor externo simulado.
						</CardDescription>
					</div>
					<Button onClick={onAdd} type="button" variant="outline">
						<PlusIcon data-icon="inline-start" />
						Nuevo
					</Button>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<Alert>
					<ShieldCheckIcon />
					<AlertTitle>Proveedor mock</AlertTitle>
					<AlertDescription>
						La arquitectura ya llama a un gateway, pero en desarrollo responde
						un adaptador local.
					</AlertDescription>
				</Alert>
				{paymentMethods.length === 0 ? (
					<Empty className="border">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<CreditCardIcon />
							</EmptyMedia>
							<EmptyTitle>Sin métodos de pago</EmptyTitle>
							<EmptyDescription>
								Agregá una referencia tokenizada para continuar.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button onClick={onAdd} type="button">
								<PlusIcon data-icon="inline-start" />
								Agregar método
							</Button>
						</EmptyContent>
					</Empty>
				) : (
					paymentMethods.map((paymentMethod) => {
						const selected = paymentMethod.id === selectedPaymentMethodId;

						return (
							<div
								className="flex flex-col gap-3 border p-4 md:flex-row md:items-start md:justify-between"
								key={paymentMethod.id}
							>
								<button
									className="flex flex-1 flex-col gap-1 text-left"
									onClick={() => onSelect(paymentMethod.id)}
									type="button"
								>
									<span className="flex items-center gap-2 font-medium text-sm">
										{selected ? <CheckCircle2Icon /> : <CreditCardIcon />}
										{paymentMethod.label}
									</span>
									<span className="text-muted-foreground text-xs/relaxed">
										{paymentTypeLabel(paymentMethod.type)} ·{" "}
										{paymentMethod.details}
									</span>
									<span className="text-muted-foreground text-xs">
										{paymentMethod.provider}
									</span>
								</button>
								<div className="flex items-center gap-2">
									{selected ? <Badge>Seleccionado</Badge> : null}
									<Button
										onClick={() => onEdit(paymentMethod)}
										size="sm"
										type="button"
										variant="outline"
									>
										<PencilIcon data-icon="inline-start" />
										Editar
									</Button>
								</div>
							</div>
						);
					})
				)}
			</CardContent>
		</Card>
	);
}

function ReviewStep({
	acceptedTerms,
	checkout,
	isSubmitting,
	paymentMethod,
	shippingAddress,
	onAcceptedTermsChange,
	onConfirm,
}: {
	acceptedTerms: boolean;
	checkout: CheckoutState;
	isSubmitting?: boolean;
	paymentMethod: CheckoutPaymentMethod;
	shippingAddress: CheckoutAddress;
	onAcceptedTermsChange: (checked: boolean) => void;
	onConfirm: () => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Confirmación del pedido</CardTitle>
				<CardDescription>
					Revisá cantidades, dirección, pago y total antes de confirmar.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				<div className="flex flex-col gap-3">
					{checkout.cart.items.map((item) => (
						<div
							className="grid gap-3 border p-3 sm:grid-cols-[1fr_auto]"
							key={item.productClientTermsId}
						>
							<div className="flex flex-col gap-1">
								<span className="font-medium text-sm">{item.product.name}</span>
								<span className="text-muted-foreground text-xs">
									{item.product.brandName ?? "Sin marca"} ·{" "}
									{formatQuantity(item.quantity, item.product.unit)}
								</span>
							</div>
							<span className="font-heading font-semibold">
								{formatCurrency(item.lineTotal, item.terms.currency)}
							</span>
						</div>
					))}
				</div>
				<Separator />
				<div className="grid gap-3 md:grid-cols-2">
					<div className="flex flex-col gap-2 border p-3">
						<span className="flex items-center gap-2 font-medium text-sm">
							<MapPinIcon />
							Envío
						</span>
						<span className="text-xs/relaxed">
							{shippingAddress.line1}
							{shippingAddress.line2 ? `, ${shippingAddress.line2}` : ""}
						</span>
						<span className="text-muted-foreground text-xs">
							{shippingAddress.city}, {shippingAddress.state}{" "}
							{shippingAddress.postalCode}
						</span>
					</div>
					<div className="flex flex-col gap-2 border p-3">
						<span className="flex items-center gap-2 font-medium text-sm">
							<CreditCardIcon />
							Pago
						</span>
						<span className="text-xs/relaxed">{paymentMethod.label}</span>
						<span className="text-muted-foreground text-xs">
							{paymentTypeLabel(paymentMethod.type)} · {paymentMethod.details}
						</span>
					</div>
				</div>
				<Alert>
					<ReceiptTextIcon />
					<AlertTitle>Términos y condiciones del pedido</AlertTitle>
					<AlertDescription>{checkout.termsText}</AlertDescription>
				</Alert>
				<div className="flex items-center gap-3 border p-3">
					<Switch
						checked={acceptedTerms}
						onCheckedChange={onAcceptedTermsChange}
					/>
					<span className="text-xs/relaxed">
						Acepto los términos y condiciones de este pedido.
					</span>
				</div>
			</CardContent>
			<CardFooter className="justify-end">
				<Button
					disabled={!acceptedTerms || isSubmitting}
					onClick={onConfirm}
					type="button"
				>
					<ShieldCheckIcon data-icon="inline-start" />
					{isSubmitting ? "Procesando pago..." : "Confirmar y pagar"}
				</Button>
			</CardFooter>
		</Card>
	);
}

function CheckoutSummary({
	checkout,
	selectedAddress,
	selectedPaymentMethod,
}: {
	checkout: CheckoutState;
	selectedAddress?: CheckoutAddress | null;
	selectedPaymentMethod?: CheckoutPaymentMethod | null;
}) {
	return (
		<Card className="lg:sticky lg:top-20">
			<CardHeader>
				<CardTitle>Resumen</CardTitle>
				<CardDescription>{checkout.cart.code}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="grid gap-2 text-xs">
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Productos</span>
						<span className="font-medium">{checkout.cart.itemCount}</span>
					</div>
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Unidades acumuladas</span>
						<span className="font-medium">{checkout.cart.totalQuantity}</span>
					</div>
				</div>
				<Separator />
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs">Total estimado</span>
					{checkout.cart.totals.map((total) => (
						<div
							className="flex items-center justify-between gap-3"
							key={total.currency}
						>
							<span className="text-xs">{total.currency}</span>
							<span className="font-heading font-semibold text-lg">
								{formatCurrency(total.amount, total.currency)}
							</span>
						</div>
					))}
				</div>
				<Separator />
				<div className="flex flex-col gap-2 text-xs">
					<span className="text-muted-foreground">Dirección</span>
					<span>{selectedAddress?.line1 ?? "Sin seleccionar"}</span>
				</div>
				<div className="flex flex-col gap-2 text-xs">
					<span className="text-muted-foreground">Pago</span>
					<span>{selectedPaymentMethod?.label ?? "Sin seleccionar"}</span>
				</div>
			</CardContent>
		</Card>
	);
}

function CheckoutResultPanel({
	result,
	onRetry,
}: {
	result: CheckoutPaymentResult;
	onRetry: () => void;
}) {
	const succeeded = result.status === "succeeded";

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						{succeeded ? <PackageCheckIcon /> : <AlertCircleIcon />}
						{succeeded ? "Compra confirmada" : "No se pudo confirmar el pago"}
					</CardTitle>
					<CardDescription>{result.message}</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="grid gap-3 md:grid-cols-2">
						<div className="flex flex-col gap-1 border p-3 text-xs">
							<span className="text-muted-foreground">Pedido</span>
							<span className="font-medium">{result.order.code}</span>
							<Badge variant={succeeded ? "secondary" : "destructive"}>
								{orderStatusLabel(result.order.status)}
							</Badge>
						</div>
						<div className="flex flex-col gap-1 border p-3 text-xs">
							<span className="text-muted-foreground">Transacción</span>
							<span className="font-medium">#{result.transaction.id}</span>
							<span>
								{result.transaction.externalTransactionId ?? "Sin ref."}
							</span>
						</div>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						<div className="flex flex-col gap-1 border p-3 text-xs">
							<span className="text-muted-foreground">Monto</span>
							<span className="font-heading font-semibold text-base">
								{formatCurrency(
									result.transaction.amount,
									result.transaction.currency,
								)}
							</span>
						</div>
						<div className="flex flex-col gap-1 border p-3 text-xs">
							<span className="text-muted-foreground">Pago</span>
							<span>{result.paymentMethod.label}</span>
							<span className="text-muted-foreground">
								{result.paymentMethod.details}
							</span>
						</div>
					</div>
					{result.status === "failed" ? (
						<Alert variant="destructive">
							<AlertCircleIcon />
							<AlertTitle>Error del pago</AlertTitle>
							<AlertDescription>
								{result.transaction.failureMessage ??
									"El proveedor informó un error."}
							</AlertDescription>
						</Alert>
					) : null}
				</CardContent>
				<CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
					{result.status === "failed" ? (
						<Button onClick={onRetry} type="button" variant="outline">
							<ChevronLeftIcon data-icon="inline-start" />
							Intentar de nuevo
						</Button>
					) : null}
					<Button asChild variant="outline">
						<Link href="/">
							<HomeIcon data-icon="inline-start" />
							Volver al inicio
						</Link>
					</Button>
					<Button asChild>
						<Link href={`/my-operations/${result.order.id}`}>
							<ShoppingBagIcon data-icon="inline-start" />
							Ver mi pedido
						</Link>
					</Button>
				</CardFooter>
			</Card>
		</main>
	);
}

export function CheckoutClient({ userId }: { userId: string }) {
	const cartSync = useCartSync({ isAuthenticated: true, userId });
	const clearCart = useCartStore((state) => state.clear);
	const [checkout, setCheckout] = useState<CheckoutState | null>(null);
	const [currentStep, setCurrentStep] = useState<CheckoutStep>("address");
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
		if (!cartSync.hasHydrated || cartSync.isSyncing) return;

		startRequested.current = true;
		startCheckout.mutate();
	}, [cartSync.hasHydrated, cartSync.isSyncing, startCheckout]);

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
		!cartSync.hasHydrated ||
		cartSync.isSyncing ||
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

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
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
							Tres pasos para dejar tu pedido listo para la agregación
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
				onStepChange={(step) => {
					if (step === "payment" && !selectedAddress) {
						toast.warning("Seleccioná una dirección para continuar");
						return;
					}
					if (
						step === "review" &&
						(!selectedAddress || !selectedPaymentMethod)
					) {
						toast.warning("Completá dirección y pago para confirmar");
						return;
					}
					setCurrentStep(step);
				}}
			/>

			<div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
				<section className="flex flex-col gap-4">
					{currentStep === "address" ? (
						<AddressStep
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
						<PaymentStep
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
						<ReviewStep
							acceptedTerms={acceptedTerms}
							checkout={checkout}
							isSubmitting={confirmAndPay.isPending}
							onAcceptedTermsChange={setAcceptedTerms}
							onConfirm={() => {
								confirmAndPay.mutate({
									acceptedTerms: true,
									idempotencyKey: paymentAttemptKey,
									paymentMethodId: selectedPaymentMethod.id,
									shippingAddressId: selectedAddress.id,
								});
							}}
							paymentMethod={selectedPaymentMethod}
							shippingAddress={selectedAddress}
						/>
					) : null}

					<div className="flex justify-between gap-2">
						<Button
							disabled={currentStep === "address"}
							onClick={() =>
								setCurrentStep(currentStep === "review" ? "payment" : "address")
							}
							type="button"
							variant="outline"
						>
							<ChevronLeftIcon data-icon="inline-start" />
							Atrás
						</Button>
						{currentStep !== "review" ? (
							<Button
								disabled={
									currentStep === "address"
										? !selectedAddress
										: !selectedPaymentMethod
								}
								onClick={() =>
									setCurrentStep(
										currentStep === "address" ? "payment" : "review",
									)
								}
								type="button"
							>
								Continuar
								<ChevronRightIcon data-icon="inline-end" />
							</Button>
						) : null}
					</div>
				</section>

				<CheckoutSummary
					checkout={checkout}
					selectedAddress={selectedAddress}
					selectedPaymentMethod={selectedPaymentMethod}
				/>
			</div>

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
