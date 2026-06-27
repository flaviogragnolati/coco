import { Badge } from "~/components/ui/badge";
import {
	orderStatusLabelMap,
	transactionStatusLabelMap,
} from "~/features/admin/crud/operations-cart/operations-cart.mappers";
import type {
	CartTraceabilityOrder,
	CartTraceabilityPayment,
} from "~/shared/common/cart-traceability.types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

function PaymentRow({ payment }: { payment: CartTraceabilityPayment }) {
	return (
		<li className="grid gap-2 rounded-none border p-2 md:grid-cols-[1fr_auto]">
			<div className="flex flex-col gap-1">
				<span className="font-medium">
					{payment.amount} {payment.currency}
				</span>
				<span className="text-muted-foreground text-xs">
					{payment.provider} / {payment.paymentMethodType}
				</span>
				<span className="font-mono text-[11px] text-muted-foreground">
					Pago #{payment.id} /{" "}
					{dateFormatter.format(new Date(payment.createdAt))}
				</span>
			</div>
			<div className="flex items-start">
				<Badge variant="secondary">
					{transactionStatusLabelMap[payment.status] ?? payment.status}
				</Badge>
			</div>
		</li>
	);
}

function OrderCard({ order }: { order: CartTraceabilityOrder }) {
	return (
		<article className="flex flex-col gap-2 rounded-none border p-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-col gap-1">
					<span className="font-mono">{order.code}</span>
					<span className="text-muted-foreground text-xs">
						#{order.id} / {dateFormatter.format(new Date(order.createdAt))}
					</span>
				</div>
				<Badge variant="outline">{orderStatusLabelMap[order.status]}</Badge>
			</div>

			<div className="flex flex-col gap-2">
				<span className="text-muted-foreground text-xs">Intentos de pago</span>
				{order.payments.length > 0 ? (
					<ul className="flex flex-col gap-2">
						{order.payments.map((payment) => (
							<PaymentRow key={payment.id} payment={payment} />
						))}
					</ul>
				) : (
					<span className="text-muted-foreground text-xs">Sin pagos</span>
				)}
			</div>
		</article>
	);
}

export function OrderPaymentPanel({
	orders,
}: {
	orders: CartTraceabilityOrder[];
}) {
	return (
		<section className="flex flex-col gap-2">
			<h2 className="font-heading font-semibold text-lg">Ordenes y pagos</h2>
			{orders.length > 0 ? (
				<div className="grid gap-3 md:grid-cols-2">
					{orders.map((order) => (
						<OrderCard key={order.id} order={order} />
					))}
				</div>
			) : (
				<div className="rounded-none border p-3 text-muted-foreground text-sm">
					Este carrito todavia no genero ordenes ni pagos.
				</div>
			)}
		</section>
	);
}
