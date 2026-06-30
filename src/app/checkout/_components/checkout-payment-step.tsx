"use client";

import {
	CheckCircle2Icon,
	CreditCardIcon,
	PencilIcon,
	PlusIcon,
	ShieldCheckIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
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
import { cn } from "~/lib/utils";
import type { CheckoutPaymentMethod } from "~/shared/common/checkout.types";

export function paymentTypeLabel(type: CheckoutPaymentMethod["type"]) {
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

export function CheckoutPaymentStep({
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
							Elegí cómo iniciar el intento de pago para este pedido.
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
					<AlertTitle>Pago externo</AlertTitle>
					<AlertDescription>
						Mercado Pago usa Checkout Pro y confirma el pedido después de la
						aprobación del proveedor.
					</AlertDescription>
				</Alert>
				{paymentMethods.length === 0 ? (
					<Empty>
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
					<div className="flex flex-col gap-3">
						{paymentMethods.map((paymentMethod) => {
							const selected = paymentMethod.id === selectedPaymentMethodId;

							return (
								<div
									className={cn(
										"flex flex-col gap-3 rounded-3xl bg-card p-3 shadow-sm ring-1 ring-foreground/5 transition-all md:flex-row md:items-start md:justify-between dark:ring-foreground/10",
										selected && "ring-2 ring-success/40",
									)}
									key={paymentMethod.id}
								>
									<button
										aria-pressed={selected}
										className="flex flex-1 flex-col gap-1 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
										onClick={() => onSelect(paymentMethod.id)}
										type="button"
									>
										<span className="flex items-center gap-2 font-medium text-sm">
											{selected ? (
												<CheckCircle2Icon className="size-4 text-success" />
											) : (
												<CreditCardIcon className="size-4 text-muted-foreground" />
											)}
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
										{selected ? (
											<Badge variant="success">
												<CheckCircle2Icon data-icon="inline-start" />
												Seleccionado
											</Badge>
										) : null}
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
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
