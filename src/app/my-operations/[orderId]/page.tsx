import { ArrowLeftIcon, CreditCardIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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
import { requireUser } from "~/server/auth/route-guards";
import type { OrderDetail } from "~/shared/common/checkout.types";
import {
	formatCurrency,
	formatQuantity,
} from "~/shared/common/commerce.helpers";
import { api } from "~/trpc/server";

function orderStatusLabel(status: OrderDetail["status"]) {
	switch (status) {
		case "processing":
			return "En procesamiento";
		case "completed":
			return "Completado";
		case "cancelled":
			return "Cancelado";
		case "failed":
			return "Fallido";
		case "refunded":
			return "Reembolsado";
		default:
			return "Pendiente";
	}
}

function transactionStatusLabel(
	status: OrderDetail["transactions"][number]["status"],
) {
	switch (status) {
		case "completed":
			return "Aprobado";
		case "failed":
			return "Rechazado";
		case "refunded":
			return "Reembolsado";
		default:
			return "Pendiente";
	}
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: null;
}

function getNestedRecord(
	value: unknown,
	key: string,
): Record<string, unknown> | null {
	return asRecord(asRecord(value)?.[key]);
}

function getString(value: unknown, fallback = "-") {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function getProductName(item: OrderDetail["items"][number]) {
	return getString(getNestedRecord(item.productSnapshot, "product")?.name);
}

function getProductUnit(item: OrderDetail["items"][number]) {
	const unit = getNestedRecord(item.productSnapshot, "product")?.unit;
	return typeof unit === "string" ? unit : "other";
}

function getLineTotal(item: OrderDetail["items"][number]) {
	return getString(asRecord(item.priceSnapshot)?.lineTotal, "0.00");
}

function getCurrency(item: OrderDetail["items"][number]) {
	const currency = asRecord(item.priceSnapshot)?.currency;
	return currency === "ARS" ||
		currency === "USD" ||
		currency === "EUR" ||
		currency === "BRL"
		? currency
		: "ARS";
}

function getAddressLine(snapshot: unknown) {
	const address = getNestedRecord(snapshot, "address");
	if (!address) return "Sin dirección";

	const line1 = getString(address.line1);
	const city = getString(address.city);
	const state = getString(address.state);
	const postalCode = getString(address.postalCode);

	return `${line1} · ${city}, ${state} ${postalCode}`;
}

export default async function OrderDetailPage({
	params,
}: {
	params: Promise<{ orderId: string }>;
}) {
	await requireUser();
	const { orderId } = await params;
	const id = Number(orderId);
	if (!Number.isInteger(id) || id <= 0) notFound();

	let order: OrderDetail;
	try {
		order = await api.orders.getMine({ id });
	} catch {
		notFound();
	}

	const latestTransaction = order.transactions[0];

	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
			<div className="flex items-center justify-between gap-3">
				<Button asChild variant="outline">
					<Link href="/my-operations">
						<ArrowLeftIcon data-icon="inline-start" />
						Mis operaciones
					</Link>
				</Button>
				<Badge
					variant={order.status === "failed" ? "destructive" : "secondary"}
				>
					{orderStatusLabel(order.status)}
				</Badge>
			</div>

			<section className="flex flex-col gap-2">
				<h1 className="font-heading font-semibold text-2xl tracking-normal">
					Pedido {order.code}
				</h1>
				<p className="text-muted-foreground text-sm/relaxed">
					Carrito de origen {order.cartCode}
				</p>
			</section>

			<div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
				<Card>
					<CardHeader>
						<CardTitle>Productos</CardTitle>
						<CardDescription>
							Líneas comerciales confirmadas para este pedido.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						{order.items.map((item) => (
							<div
								className="grid gap-3 border p-3 sm:grid-cols-[1fr_auto]"
								key={item.id}
							>
								<div className="flex flex-col gap-1">
									<span className="font-medium text-sm">
										{getProductName(item)}
									</span>
									<span className="text-muted-foreground text-xs">
										{formatQuantity(
											item.quantity,
											getProductUnit(item) as never,
										)}
									</span>
								</div>
								<span className="font-heading font-semibold">
									{formatCurrency(getLineTotal(item), getCurrency(item))}
								</span>
							</div>
						))}
					</CardContent>
				</Card>

				<div className="flex flex-col gap-4">
					<Card>
						<CardHeader>
							<CardTitle>Resumen</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 text-xs">
							<div className="flex items-center justify-between gap-3">
								<span className="text-muted-foreground">Items</span>
								<span className="font-medium">{order.itemCount}</span>
							</div>
							<div className="flex items-center justify-between gap-3">
								<span className="text-muted-foreground">Monto</span>
								<span className="font-heading font-semibold text-base">
									{order.currency
										? formatCurrency(order.totalAmount, order.currency)
										: "-"}
								</span>
							</div>
							<Separator />
							<div className="flex flex-col gap-2">
								<span className="flex items-center gap-2 text-muted-foreground">
									<MapPinIcon />
									Envío
								</span>
								<span>{getAddressLine(order.shippingAddressSnapshot)}</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CreditCardIcon />
								Pago
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 text-xs">
							{latestTransaction ? (
								<>
									<div className="flex items-center justify-between gap-3">
										<span className="text-muted-foreground">Estado</span>
										<Badge
											variant={
												latestTransaction.status === "failed"
													? "destructive"
													: "secondary"
											}
										>
											{transactionStatusLabel(latestTransaction.status)}
										</Badge>
									</div>
									<div className="flex items-center justify-between gap-3">
										<span className="text-muted-foreground">Transacción</span>
										<span className="font-medium">#{latestTransaction.id}</span>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-muted-foreground">Referencia</span>
										<span>
											{latestTransaction.externalTransactionId ?? "Sin ref."}
										</span>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-muted-foreground">Método</span>
										<span>{latestTransaction.paymentMethod.label}</span>
										<span className="text-muted-foreground">
											{latestTransaction.paymentMethod.details}
										</span>
									</div>
								</>
							) : (
								<span className="text-muted-foreground">Sin transacciones</span>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
}
