import type { DomainEventInput } from "~/shared/common/domain-events.types";

/**
 * `admin` is what distinguishes a manually settled external payment from a
 * gateway-confirmed one in the event trail (ADR 0010).
 */
export type OrderSubmissionActor =
	| { source: "user"; actorId: string }
	| { source: "admin"; actorId: string }
	| { source: "system"; actorReference: string };

export type OrderSubmissionPair = {
	cartItemId: number;
	quantity: string;
	userOrderItemId: number;
};

/**
 * The outbox idempotency key for a submitted cart item. Its exact shape is a
 * contract: both payment paths must derive the same key for the same
 * (order, transaction, cart item), or a redirect-confirmed and a
 * webhook-confirmed payment would each publish their own copy of the event.
 */
export function buildSubmittedToOrderEventKey(input: {
	orderId: number;
	transactionId: number;
	cartItemId: number;
}) {
	return `checkout:order:${input.orderId}:transaction:${input.transactionId}:cartItem:${input.cartItemId}:submittedToOrder`;
}

/**
 * One `cart.item.submittedToOrder` event per ordered item. `quantity` comes
 * from the cart item, not the order item: it is what both producers have always
 * published, and downstream aggregation reads it as the cart-side fact.
 */
export function buildSubmittedToOrderEvents(input: {
	orderId: number;
	cartId: number;
	transactionId: number;
	actor: OrderSubmissionActor;
	pairs: OrderSubmissionPair[];
}): DomainEventInput[] {
	return input.pairs.map((pair) => ({
		type: "cart.item.submittedToOrder",
		eventKey: buildSubmittedToOrderEventKey({
			orderId: input.orderId,
			transactionId: input.transactionId,
			cartItemId: pair.cartItemId,
		}),
		aggregateType: "CartItem",
		aggregateId: String(pair.cartItemId),
		actor: input.actor,
		payload: {
			cartItemId: String(pair.cartItemId),
			cartId: String(input.cartId),
			orderId: String(input.orderId),
			userOrderItemId: String(pair.userOrderItemId),
			transactionId: String(input.transactionId),
			quantity: pair.quantity,
		},
	}));
}
