import { notFound } from "next/navigation";

import { buildCustomerOrderJourneyView } from "~/features/tracking/customer-order-journey";
import { requireUser } from "~/server/auth/route-guards";
import type { OrderDetail } from "~/shared/common/checkout.types";
import { canRepeatOrder } from "~/shared/common/order-display";
import type { UserOrderItemTimeline } from "~/shared/common/tracking.types";
import { api } from "~/trpc/server";
import { ExternalPaymentPanel } from "./_components/external-payment-panel";
import {
	OrderDetailView,
	toOrderJourneyItemInputs,
} from "./_components/order-detail-view";
import { RepeatOrderDialog } from "./_components/repeat-order-dialog";

export default async function OrderDetailPage({
	params,
}: {
	params: Promise<{ orderId: string }>;
}) {
	const session = await requireUser();
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

	return (
		<OrderDetailView
			actionsSlot={
				canRepeatOrder(order.status) ? (
					<RepeatOrderDialog orderId={order.id} userId={session.user.id} />
				) : null
			}
			externalPaymentSlot={
				order.externalPayment ? (
					<ExternalPaymentPanel
						externalPayment={order.externalPayment}
						orderId={order.id}
					/>
				) : null
			}
			journeyView={buildCustomerOrderJourneyView(
				toOrderJourneyItemInputs(order, itemTimelines),
			)}
			order={order}
		/>
	);
}
