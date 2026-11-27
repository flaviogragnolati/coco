import "server-only";

import { notFound } from "next/navigation";

import type { OrderDetail } from "~/shared/common/checkout.types";
import {
	canRepeatOrder,
	selectOrderDisplayAttempt,
} from "~/shared/common/order-display";
import type { UserOrderItemTimeline } from "~/shared/common/tracking.types";
import { api } from "~/trpc/server";
import { ExternalPaymentPanel } from "../[orderId]/_components/external-payment-panel";
import {
	OrderDetailView,
	toOrderJourneyItemInputs,
} from "../[orderId]/_components/order-detail-view";
import { OrderPaymentPending } from "../[orderId]/_components/order-payment-pending";
import { RepeatOrderDialog } from "../[orderId]/_components/repeat-order-dialog";
import { type OrderArrival, orderArrivalBanner } from "./order-arrival";

/** What to do to pay, while the order waits for its payment. */
function paymentSlotFor(order: OrderDetail) {
	if (order.externalPayment) {
		return (
			<ExternalPaymentPanel
				externalPayment={order.externalPayment}
				orderId={order.id}
			/>
		);
	}
	if (order.status !== "pending") return null;

	const attempt = selectOrderDisplayAttempt(order.transactions);
	if (attempt?.provider !== "mercadopago") return null;
	if (attempt.status === "pending") {
		return <OrderPaymentPending rejected={false} />;
	}
	if (attempt.status === "failed" || attempt.status === "cancelled") {
		return <OrderPaymentPending rejected />;
	}
	return null;
}

/** One order as the order column shows it, read for the signed-in user. */
export async function OrderDetailSection({
	orderId,
	userId,
	arrival,
}: {
	orderId: number;
	userId: string;
	arrival: OrderArrival | null;
}) {
	let order: OrderDetail;
	let itemTimelines: UserOrderItemTimeline[];
	try {
		[order, itemTimelines] = await Promise.all([
			api.orders.getMine({ id: orderId }),
			api.tracking.getOrderItemTimelines({ orderId }),
		]);
	} catch {
		notFound();
	}

	const attempt = selectOrderDisplayAttempt(order.transactions);

	return (
		<OrderDetailView
			actionsSlot={
				canRepeatOrder(order.status) ? (
					<RepeatOrderDialog orderId={order.id} userId={userId} />
				) : null
			}
			arrivalBanner={orderArrivalBanner({
				arrival,
				attempt: attempt
					? { provider: attempt.provider, status: attempt.status }
					: null,
			})}
			journeyItems={toOrderJourneyItemInputs(order, itemTimelines)}
			order={order}
			paymentSlot={paymentSlotFor(order)}
		/>
	);
}
