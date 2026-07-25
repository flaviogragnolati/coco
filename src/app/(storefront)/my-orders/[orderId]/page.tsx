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
import { buildCustomerOrderJourneyView } from "~/features/tracking/customer-order-journey";
import { CustomerOrderJourney } from "~/features/tracking/customer-order-journey-view";
import { requireUser } from "~/server/auth/route-guards";
import type { OrderDetail } from "~/shared/common/checkout.types";
import {
	formatCurrency,
	formatQuantity,
} from "~/shared/common/commerce.helpers";
import {
	orderStatusChipConfigMap,
	paymentStatusLabelMap,
} from "~/shared/common/order-display";
import type { UserOrderItemTimeline } from "~/shared/common/tracking.types";
import { api } from "~/trpc/server";

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

function itemQuantityLabel(item: OrderDetail["items"][number]) {
	return formatQuantity(item.quantity, getProductUnit(item) as never);
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
	let itemTimelines: UserOrderItemTimeline[];
	try {
		[order, itemTimelines] = await Promise.all([
			api.orders.getMine({ id }),
			api.tracking.getOrderItemTimelines({ orderId: id }),
		]);
	} catch {
		notFound();
	}

	const latestTransaction = order.transactions[0];
	const timelineByCartItemId = new Map(
		itemTimelines.map((timeline) => [timeline.cartItemId, timeline]),
	);
	const journeyView = buildCustomerOrderJourneyView(
		order.items.map((item) => ({
			cartItemId: item.sourceCartItemId,
			productName: getProductName(item),
			quantityLabel: itemQuantityLabel(item),
			timeline: timelineByCartItemId.get(item.sourceCartItemId),
		})),
	);
	const statusChip = orderStatusChipConfigMap[order.status];
	const StatusIcon = statusChip.icon;

	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
			<div className="flex items-center justify-between gap-3">
				<Button asChild variant="outline">
					<Link href="/my-orders">
						<ArrowLeftIcon data-icon="inline-start" />
						Mis pedidos
					</Link>
				</Button>
				<Badge variant={statusChip.variant}>
					<StatusIcon data-icon="inline-start" />
					{statusChip.label}
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

			<CustomerOrderJourney view={journeyView} />

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
								className="flex items-start justify-between gap-3 rounded-3xl border p-3"
								key={item.id}
							>
								<div className="flex min-w-0 flex-col gap-1">
									<span className="font-medium text-sm">
										{getProductName(item)}
									</span>
									<span className="text-muted-foreground text-xs">
										{itemQuantityLabel(item)}
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
							<div className="flex items-start gap-3">
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
									<MapPinIcon className="size-4" />
								</span>
								<div className="flex min-w-0 flex-col gap-1">
									<span className="text-muted-foreground">Envío</span>
									<span>{getAddressLine(order.shippingAddressSnapshot)}</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CreditCardIcon className="size-4" />
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
												latestTransaction.status === "completed"
													? "success"
													: latestTransaction.status === "failed"
														? "destructive"
														: "secondary"
											}
										>
											{paymentStatusLabelMap[latestTransaction.status]}
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
