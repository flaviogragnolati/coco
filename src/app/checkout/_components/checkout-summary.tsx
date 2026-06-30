"use client";

import {
	ChevronUpIcon,
	CreditCardIcon,
	MapPinIcon,
	PencilIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import type { CartSnapshot } from "~/shared/common/cart.types";
import type {
	CheckoutAddress,
	CheckoutPaymentMethod,
} from "~/shared/common/checkout.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import type { CheckoutStepId } from "./checkout-steps";

const ITEM_PEEK_LIMIT = 4;

function SummaryEditRow({
	icon,
	label,
	value,
	editStep,
	onEditStep,
	canEdit,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	editStep: CheckoutStepId;
	onEditStep: (step: CheckoutStepId) => void;
	canEdit: boolean;
}) {
	return (
		<div className="flex items-start justify-between gap-2">
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
					{icon}
					{label}
				</span>
				<span className="truncate text-sm">{value}</span>
			</div>
			{canEdit ? (
				<Button
					aria-label={`Editar ${label.toLowerCase()}`}
					onClick={() => onEditStep(editStep)}
					size="icon-xs"
					type="button"
					variant="ghost"
				>
					<PencilIcon />
				</Button>
			) : null}
		</div>
	);
}

export function CheckoutSummary({
	cart,
	selectedAddress,
	selectedPaymentMethod,
	currentStep,
	onEditStep,
	className,
}: {
	cart: CartSnapshot;
	selectedAddress?: CheckoutAddress | null;
	selectedPaymentMethod?: CheckoutPaymentMethod | null;
	currentStep: CheckoutStepId;
	onEditStep: (step: CheckoutStepId) => void;
	className?: string;
}) {
	const peekItems = cart.items.slice(0, ITEM_PEEK_LIMIT);
	const remaining = cart.items.length - peekItems.length;

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between gap-3">
					<CardTitle>Resumen</CardTitle>
					{cart.code ? <Badge variant="secondary">{cart.code}</Badge> : null}
				</div>
				<CardDescription>Tu pedido mayorista compartido</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{peekItems.length > 0 ? (
					<div className="flex flex-col gap-2">
						{peekItems.map((item) => (
							<div
								className="flex items-center justify-between gap-3 text-xs"
								key={item.productClientTermsId}
							>
								<span className="min-w-0 truncate text-muted-foreground">
									{item.product.name}
								</span>
								<span className="shrink-0 font-medium">
									{formatCurrency(item.lineTotal, item.terms.currency)}
								</span>
							</div>
						))}
						{remaining > 0 ? (
							<span className="text-muted-foreground text-xs">
								+{remaining}{" "}
								{remaining === 1 ? "producto más" : "productos más"}
							</span>
						) : null}
					</div>
				) : null}

				<Separator />
				<div className="grid gap-2 text-xs">
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Productos</span>
						<span className="font-medium">{cart.itemCount}</span>
					</div>
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Unidades acumuladas</span>
						<span className="font-medium">{cart.totalQuantity}</span>
					</div>
				</div>

				<Separator />
				<div className="flex flex-col gap-2">
					<span className="text-muted-foreground text-xs">Total estimado</span>
					{cart.totals.length > 0 ? (
						cart.totals.map((total) => (
							<div
								className="flex items-center justify-between gap-3"
								key={total.currency}
							>
								<Badge variant="info">{total.currency}</Badge>
								<span className="font-heading font-semibold text-lg">
									{formatCurrency(total.amount, total.currency)}
								</span>
							</div>
						))
					) : (
						<span className="text-muted-foreground text-xs">Sin items</span>
					)}
				</div>

				<Separator />
				<div className="flex flex-col gap-3">
					<SummaryEditRow
						canEdit={currentStep !== "shipping"}
						editStep="shipping"
						icon={<MapPinIcon className="size-3.5" />}
						label="Dirección"
						onEditStep={onEditStep}
						value={selectedAddress?.line1 ?? "Sin seleccionar"}
					/>
					<SummaryEditRow
						canEdit={currentStep !== "payment"}
						editStep="payment"
						icon={<CreditCardIcon className="size-3.5" />}
						label="Pago"
						onEditStep={onEditStep}
						value={selectedPaymentMethod?.label ?? "Sin seleccionar"}
					/>
				</div>
			</CardContent>
		</Card>
	);
}

export function CheckoutMobileBar({
	cart,
	currentStep,
	canContinue,
	canConfirm,
	isSubmitting,
	onPrimary,
	onOpenSummary,
}: {
	cart: CartSnapshot;
	currentStep: CheckoutStepId;
	canContinue: boolean;
	canConfirm: boolean;
	isSubmitting?: boolean;
	onPrimary: () => void;
	onOpenSummary: () => void;
}) {
	const isReview = currentStep === "review";
	const primaryLabel = isReview
		? isSubmitting
			? "Procesando..."
			: "Confirmar y pagar"
		: "Continuar";
	const primaryDisabled = isReview ? !canConfirm || isSubmitting : !canContinue;
	const primaryTotal = cart.totals[0];
	const extraCurrencies = cart.totals.length - 1;

	return (
		<div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur lg:hidden">
			<div className="mx-auto flex w-full max-w-7xl items-center gap-3">
				<button
					className="flex min-w-0 flex-col items-start gap-0.5 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
					onClick={onOpenSummary}
					type="button"
				>
					<span className="font-heading font-semibold text-base leading-none">
						{primaryTotal
							? formatCurrency(primaryTotal.amount, primaryTotal.currency)
							: "—"}
						{extraCurrencies > 0 ? (
							<span className="ml-1 font-normal text-muted-foreground text-xs">
								+{extraCurrencies}
							</span>
						) : null}
					</span>
					<span className="flex items-center gap-1 text-muted-foreground text-xs">
						<ChevronUpIcon className="size-3" />
						Ver resumen
					</span>
				</button>
				<Button
					className="flex-1"
					disabled={primaryDisabled}
					onClick={onPrimary}
					type="button"
				>
					{primaryLabel}
				</Button>
			</div>
		</div>
	);
}
