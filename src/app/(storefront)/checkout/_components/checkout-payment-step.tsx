"use client";

import {
	BanknoteArrowUpIcon,
	CheckCircle2Icon,
	CreditCardIcon,
	WalletIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import { formatTransferDiscountPercent } from "~/features/cart/_components/transfer-total";
import { paymentMethodCopy } from "~/features/checkout/payment-method-copy";
import { SelectableTile } from "~/features/checkout/selectable-tile";
import type { CatalogCurrency } from "~/shared/common/catalog.types";
import type { CheckoutPaymentMethod } from "~/shared/common/checkout.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { applyTransferDiscount } from "~/shared/common/transfer-discount";

export function CheckoutPaymentStep({
	paymentMethods,
	selectedPaymentMethodId,
	onSelect,
	total,
	transferDiscountPercent,
}: {
	paymentMethods: CheckoutPaymentMethod[];
	selectedPaymentMethodId: number | null;
	onSelect: (id: number) => void;
	total: { amount: string; currency: CatalogCurrency } | undefined;
	transferDiscountPercent: number | null;
}) {
	const transferDiscount = total
		? applyTransferDiscount({
				subtotal: total.amount,
				percent: transferDiscountPercent,
				currency: total.currency,
			})
		: null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Método de pago</CardTitle>
				<CardDescription>
					Elegí cómo iniciar el intento de pago para este pedido.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{paymentMethods.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<CreditCardIcon />
							</EmptyMedia>
							<EmptyTitle>Sin medios de pago habilitados</EmptyTitle>
							<EmptyDescription>
								Ahora mismo no hay ningún medio de pago disponible. Escribinos a
								soporte para que lo habilitemos.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="flex flex-col gap-3">
						{paymentMethods.map((paymentMethod) => {
							const selected = paymentMethod.id === selectedPaymentMethodId;
							const copy = paymentMethodCopy(paymentMethod);

							return (
								<SelectableTile
									actions={
										selected ? (
											<Badge variant="success">
												<CheckCircle2Icon data-icon="inline-start" />
												Seleccionado
											</Badge>
										) : null
									}
									key={paymentMethod.id}
									onSelect={() => onSelect(paymentMethod.id)}
									selected={selected}
								>
									<span className="flex items-center gap-2 font-medium text-sm">
										{paymentMethod.provider === "external" ? (
											<BanknoteArrowUpIcon className="size-4 text-muted-foreground" />
										) : (
											<WalletIcon className="size-4 text-muted-foreground" />
										)}
										{copy.title}
									</span>
									<span className="text-muted-foreground text-xs/relaxed">
										{copy.description}
									</span>
									{paymentMethod.provider === "external" &&
									transferDiscount &&
									total ? (
										<span className="font-medium text-sm tabular-nums">
											{`${formatCurrency(transferDiscount.total, total.currency)} con ${formatTransferDiscountPercent(transferDiscount.percent)} % de descuento`}
										</span>
									) : null}
								</SelectableTile>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
