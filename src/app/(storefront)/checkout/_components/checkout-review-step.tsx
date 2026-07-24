"use client";

import {
	CreditCardIcon,
	MapPinIcon,
	PencilIcon,
	ReceiptTextIcon,
	ShieldCheckIcon,
	ShoppingBagIcon,
} from "lucide-react";

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
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { CartLineRow } from "~/features/cart/_components/cart-line-row";
import type { CartSnapshot } from "~/shared/common/cart.types";
import type {
	CheckoutAddress,
	CheckoutPaymentMethod,
} from "~/shared/common/checkout.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { paymentTypeLabel } from "./checkout-payment-step";
import type { CheckoutStepId } from "./checkout-steps";

function ReviewSection({
	icon,
	title,
	editStep,
	onEditStep,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	editStep: CheckoutStepId;
	onEditStep: (step: CheckoutStepId) => void;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10">
			<div className="flex items-center justify-between gap-3">
				<span className="flex items-center gap-2 font-medium text-sm">
					{icon}
					{title}
				</span>
				<Button
					onClick={() => onEditStep(editStep)}
					size="sm"
					type="button"
					variant="ghost"
				>
					<PencilIcon data-icon="inline-start" />
					Editar
				</Button>
			</div>
			{children}
		</div>
	);
}

export function CheckoutReviewStep({
	cart,
	shippingAddress,
	paymentMethod,
	termsText,
	acceptedTerms,
	isSubmitting,
	onAcceptedTermsChange,
	onConfirm,
	onEditStep,
}: {
	cart: CartSnapshot;
	shippingAddress: CheckoutAddress;
	paymentMethod: CheckoutPaymentMethod;
	termsText: string;
	acceptedTerms: boolean;
	isSubmitting?: boolean;
	onAcceptedTermsChange: (checked: boolean) => void;
	onConfirm: () => void;
	onEditStep: (step: CheckoutStepId) => void;
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
				<ReviewSection
					editStep="order"
					icon={<ShoppingBagIcon className="size-4 text-muted-foreground" />}
					onEditStep={onEditStep}
					title="Pedido"
				>
					<div className="flex flex-col gap-3">
						{cart.items.map((item) => (
							<CartLineRow
								item={item}
								key={item.productClientTermsId}
								readOnly
								variant="compact"
							/>
						))}
					</div>
					<Separator />
					<div className="flex flex-col gap-2">
						{cart.totals.map((total) => (
							<div
								className="flex items-center justify-between gap-3"
								key={total.currency}
							>
								<Badge variant="info">{total.currency}</Badge>
								<span className="font-heading font-semibold">
									{formatCurrency(total.amount, total.currency)}
								</span>
							</div>
						))}
					</div>
				</ReviewSection>

				<div className="grid gap-3 md:grid-cols-2">
					<ReviewSection
						editStep="shipping"
						icon={<MapPinIcon className="size-4 text-muted-foreground" />}
						onEditStep={onEditStep}
						title="Envío"
					>
						<div className="flex flex-col gap-1">
							<span className="text-xs/relaxed">
								{shippingAddress.line1}
								{shippingAddress.line2 ? `, ${shippingAddress.line2}` : ""}
							</span>
							<span className="text-muted-foreground text-xs">
								{shippingAddress.city}, {shippingAddress.state}{" "}
								{shippingAddress.postalCode}
							</span>
						</div>
					</ReviewSection>
					<ReviewSection
						editStep="payment"
						icon={<CreditCardIcon className="size-4 text-muted-foreground" />}
						onEditStep={onEditStep}
						title="Pago"
					>
						<div className="flex flex-col gap-1">
							<span className="text-xs/relaxed">{paymentMethod.label}</span>
							<span className="text-muted-foreground text-xs">
								{paymentTypeLabel(paymentMethod.type)} · {paymentMethod.details}
							</span>
						</div>
					</ReviewSection>
				</div>

				<Alert>
					<ReceiptTextIcon />
					<AlertTitle>Términos y condiciones del pedido</AlertTitle>
					<AlertDescription>{termsText}</AlertDescription>
				</Alert>
				<div className="flex items-center gap-3 rounded-3xl bg-muted/40 p-3">
					<Switch
						aria-label="Aceptar los términos y condiciones del pedido"
						checked={acceptedTerms}
						onCheckedChange={onAcceptedTermsChange}
					/>
					<span className="text-xs/relaxed">
						Acepto los términos y condiciones de este pedido.
					</span>
				</div>
			</CardContent>
			{/* Desktop confirm; on mobile the sticky bottom bar owns the CTA. */}
			<CardFooter className="hidden justify-end lg:flex">
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
