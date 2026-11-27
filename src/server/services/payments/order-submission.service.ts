import "server-only";

import { TRPCError } from "@trpc/server";
import type { Prisma, UserOrderStatus } from "~/prisma/client";
import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import {
	cancelOtherPendingAttempts,
	updateCartStatus,
	updateOrderStatus,
} from "~/server/services/checkout/checkout.data";
import { enqueueCustomerEmail } from "~/server/services/notifications/customer-email.data";
import {
	buildSubmittedToOrderEvents,
	type OrderSubmissionActor,
} from "./order-submission.decision";

/** Only the first credited attempt may submit the order's still-live snapshot items. */
export async function submitOrderForCompletedPayment(
	tx: Prisma.TransactionClient,
	input: {
		orderId: number;
		orderStatus: UserOrderStatus;
		cartId: number;
		transactionId: number;
		actor: OrderSubmissionActor;
	},
) {
	// Another method can still be credited after the first payment or even after delivery.
	if (
		input.orderStatus !== "pending" &&
		input.orderStatus !== "failed" &&
		input.orderStatus !== "cancelled"
	) {
		return { cancelledAttemptIds: [] };
	}

	// Cancellation can also be the fulfillment outcome of a previously paid order.
	if (input.orderStatus === "cancelled") {
		const priorPayment = await tx.userTransaction.findFirst({
			where: {
				userOrderId: input.orderId,
				id: { not: input.transactionId },
				completedAt: { not: null },
			},
			select: { id: true },
		});
		if (priorPayment) return { cancelledAttemptIds: [] };
	}

	const orderItems = await tx.userOrderItem.findMany({
		where: { userOrderId: input.orderId },
		select: { id: true, sourceCartItemId: true },
	});
	const orderItemsByCartItemId = new Map(
		orderItems.map((item) => [item.sourceCartItemId, item]),
	);

	const eligible = await tx.cartItem.findMany({
		where: {
			id: { in: Array.from(orderItemsByCartItemId.keys()) },
			deleted: false,
			status: "inCart",
		},
		select: { id: true, quantity: true },
	});

	await tx.cartItem.updateMany({
		where: { id: { in: eligible.map((cartItem) => cartItem.id) } },
		data: {
			status: "submitted",
			fulfillmentStatus: "awaitingAggregation",
		},
	});
	await updateCartStatus(tx, input.cartId, "submitted");
	await updateOrderStatus(tx, input.orderId, "processing");
	// A switch of payment method can leave an older attempt payable (ADR 0013).
	// Once one is paid the others are cancelled, except a declared transfer,
	// which an admin decides.
	const cancelledAttemptIds = await cancelOtherPendingAttempts(tx, {
		userOrderId: input.orderId,
		keepTransactionId: input.transactionId,
	});

	await DomainEventPublisher.publishMany(
		tx,
		buildSubmittedToOrderEvents({
			orderId: input.orderId,
			cartId: input.cartId,
			transactionId: input.transactionId,
			actor: input.actor,
			pairs: eligible.map((cartItem) => {
				const orderItem = orderItemsByCartItemId.get(cartItem.id);

				if (!orderItem) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message:
							"No se pudo vincular un producto de tu pedido al confirmarlo.",
					});
				}

				return {
					cartItemId: cartItem.id,
					quantity: cartItem.quantity.toString(),
					userOrderItemId: orderItem.id,
				};
			}),
		}),
	);

	await enqueueCustomerEmail(tx, input.orderId, `confirm/${input.orderId}`, {
		kind: "confirmed",
		attemptId: input.transactionId,
	});
	return { cancelledAttemptIds };
}
