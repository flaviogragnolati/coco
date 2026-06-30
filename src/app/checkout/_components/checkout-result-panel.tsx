"use client";

import {
	AlertCircleIcon,
	ChevronLeftIcon,
	HomeIcon,
	PackageCheckIcon,
	ShoppingBagIcon,
} from "lucide-react";
import Link from "next/link";

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
import type { CheckoutPaymentResult } from "~/shared/common/checkout.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";

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

function ResultField({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1 rounded-3xl bg-muted/40 p-3 text-xs">
			<span className="text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}

export function CheckoutResultPanel({
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
					<div className="flex items-start justify-between gap-3">
						<div className="flex flex-col gap-1">
							<CardTitle className="flex items-center gap-2">
								{succeeded ? (
									<PackageCheckIcon className="size-5 text-success" />
								) : (
									<AlertCircleIcon className="size-5 text-destructive" />
								)}
								{succeeded
									? "Compra confirmada"
									: "No se pudo confirmar el pago"}
							</CardTitle>
							<CardDescription>{result.message}</CardDescription>
						</div>
						<Badge variant={succeeded ? "success" : "destructive"}>
							{orderStatusLabel(result.order.status)}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="grid gap-3 md:grid-cols-2">
						<ResultField label="Pedido">
							<span className="font-medium">{result.order.code}</span>
						</ResultField>
						<ResultField label="Transacción">
							<span className="font-medium">#{result.transaction.id}</span>
							<span>
								{result.transaction.externalTransactionId ?? "Sin ref."}
							</span>
						</ResultField>
					</div>
					<div className="grid gap-3 md:grid-cols-2">
						<ResultField label="Monto">
							<span className="font-heading font-semibold text-base">
								{formatCurrency(
									result.transaction.amount,
									result.transaction.currency,
								)}
							</span>
						</ResultField>
						<ResultField label="Pago">
							<span>{result.paymentMethod.label}</span>
							<span className="text-muted-foreground">
								{result.paymentMethod.details}
							</span>
						</ResultField>
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
