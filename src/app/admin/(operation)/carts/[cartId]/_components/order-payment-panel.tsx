"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	DetailEmpty,
	DetailItem,
	DetailSection,
	DetailSectionTitle,
} from "~/features/admin/crud/_components/crud-detail";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import {
	orderStatusConfig,
	transactionStatusConfig,
} from "~/features/admin/crud/operations-cart/operations-cart.mappers";
import { OrderDeliveryChangeDialog } from "~/features/admin/crud/user-order/order-delivery-change-dialog";
import {
	OrderNotificationChip,
	useOrderMailSummaries,
} from "~/features/admin/notifications/order-notification-chip";
import type {
	CartTraceabilityOrder,
	CartTraceabilityPayment,
} from "~/shared/common/cart-traceability.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import {
	describeOrderDelivery,
	formatOrderDelivery,
} from "~/shared/common/delivery-display";
import { api } from "~/trpc/react";

function PaymentRow({ payment }: { payment: CartTraceabilityPayment }) {
	return (
		<li>
			<DetailItem className="flex flex-wrap items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<span className="font-semibold text-sm tabular-nums">
						{payment.amount}{" "}
						<span className="font-normal text-muted-foreground">
							{payment.currency}
						</span>
					</span>
					<span className="text-muted-foreground text-xs">
						{payment.provider} / {payment.paymentMethodType}
					</span>
					<span className="text-muted-foreground text-xs">
						Pago <span className="font-mono">#{payment.id}</span> ·{" "}
						{formatDateTimeShort(new Date(payment.createdAt))}
					</span>
				</div>
				<StatusChip config={transactionStatusConfig[payment.status]} />
			</DetailItem>
		</li>
	);
}

function OrderDeliveryBlock({ order }: { order: CartTraceabilityOrder }) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const utils = api.useUtils();
	const delivery = describeOrderDelivery(order);

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between gap-2">
				<DetailSectionTitle>Entrega</DetailSectionTitle>
				{order.status === "processing" ? (
					<Button
						onClick={() => setDialogOpen(true)}
						size="sm"
						type="button"
						variant="outline"
					>
						Cambiar entrega
					</Button>
				) : null}
			</div>
			<span className="text-sm">
				{delivery
					? formatOrderDelivery(delivery)
					: "Sin elección (pedido anterior al checkout con entrega)"}
			</span>
			{delivery?.instructions ? (
				<span className="text-muted-foreground text-xs">
					{delivery.instructions}
				</span>
			) : null}
			<OrderDeliveryChangeDialog
				onChanged={() =>
					Promise.all([
						utils.admin.cartTraceability.invalidate(),
						utils.admin.notification.invalidate(),
						utils.admin.userOrder.deliveryOptions.invalidate({
							orderId: order.id,
						}),
					])
				}
				onOpenChange={setDialogOpen}
				open={dialogOpen}
				orderId={order.id}
			/>
		</div>
	);
}

function OrderCard({
	order,
	mailChip,
}: {
	order: CartTraceabilityOrder;
	mailChip: ReactNode;
}) {
	return (
		<DetailSection>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<span className="font-medium font-mono">{order.code}</span>
					{mailChip}
					<span className="text-muted-foreground text-xs">
						<span className="font-mono">#{order.id}</span> ·{" "}
						{formatDateTimeShort(new Date(order.createdAt))}
					</span>
				</div>
				<StatusChip config={orderStatusConfig[order.status]} />
			</div>

			<OrderDeliveryBlock order={order} />

			<div className="flex flex-col gap-2">
				<DetailSectionTitle>Intentos de pago</DetailSectionTitle>
				{order.payments.length > 0 ? (
					<ul className="flex flex-col gap-2">
						{order.payments.map((payment) => (
							<PaymentRow key={payment.id} payment={payment} />
						))}
					</ul>
				) : (
					<DetailEmpty>Sin pagos</DetailEmpty>
				)}
			</div>
		</DetailSection>
	);
}

export function OrderPaymentPanel({
	orders,
}: {
	orders: CartTraceabilityOrder[];
}) {
	const mailSummaries = useOrderMailSummaries(orders);
	return (
		<section className="flex flex-col gap-2">
			<h2 className="font-heading font-semibold text-lg">Órdenes y pagos</h2>
			{orders.length > 0 ? (
				<div className="grid gap-3 md:grid-cols-2">
					{orders.map((order) => (
						<OrderCard
							key={order.id}
							mailChip={
								<OrderNotificationChip
									orderId={order.id}
									summary={mailSummaries.get(order.id)}
								/>
							}
							order={order}
						/>
					))}
				</div>
			) : (
				<DetailEmpty>
					Este carrito todavía no generó órdenes ni pagos.
				</DetailEmpty>
			)}
		</section>
	);
}
