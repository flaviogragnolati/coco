import "server-only";

import { TRPCError } from "@trpc/server";

import type { Prisma } from "~/prisma/client";
import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import {
	updateCartStatus,
	updateOrderStatus,
} from "~/server/services/checkout/checkout.data";
import {
	buildSubmittedToOrderEvents,
	type OrderSubmissionActor,
} from "./order-submission.decision";

/**
 * The single "payment completed ⇒ submit the cart items, close the cart,
 * advance the order, publish the facts" transition, shared by the redirect
 * (mock gateway) and webhook (Mercado Pago) paths.
 *
 * The set it acts on is the intersection of the order snapshot and the cart
 * items still live: an item added after the order was snapshotted has no order
 * item to reference, and an item removed mid-payment must not be resurrected as
 * submitted. Both are reachable whenever the cart is not frozen.
 */
export async function submitOrderForCompletedPayment(
	tx: Prisma.TransactionClient,
	input: {
		orderId: number;
		cartId: number;
		transactionId: number;
		actor: OrderSubmissionActor;
	},
) {
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
	const order = await updateOrderStatus(tx, input.orderId, "processing");

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
						message: "No se pudo vincular el item del carrito con el pedido.",
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

	return order;
}
