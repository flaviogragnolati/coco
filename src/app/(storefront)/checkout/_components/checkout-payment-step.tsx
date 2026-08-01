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
import type { CheckoutPaymentMethod } from "~/shared/common/checkout.types";
import { SelectableTile } from "./selectable-tile";

const PAYMENT_PROVIDER_COPY = {
	mercadopago: {
		title: "Mercado Pago",
		description: "Pagás con tarjeta, dinero en cuenta o efectivo",
	},
	external: {
		title: "Pago externo",
		description:
			"Transferencia bancaria. Te damos los datos al confirmar el pedido",
	},
} as const;

/**
 * Copy comes from the provider, never from `type`: the external method is a
 * `bank_transfer` internally, and the user has no business seeing either that
 * or the raw provider slug.
 */
export function paymentMethodCopy(paymentMethod: CheckoutPaymentMethod) {
	return (
		PAYMENT_PROVIDER_COPY[
			paymentMethod.provider as keyof typeof PAYMENT_PROVIDER_COPY
		] ?? { title: paymentMethod.label, description: paymentMethod.details }
	);
}

export function CheckoutPaymentStep({
	paymentMethods,
	selectedPaymentMethodId,
	onSelect,
}: {
	paymentMethods: CheckoutPaymentMethod[];
	selectedPaymentMethodId: number | null;
	onSelect: (id: number) => void;
}) {
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
								</SelectableTile>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
