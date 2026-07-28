import { expect, test } from "vitest";

import {
	buildSubmittedToOrderEventKey,
	buildSubmittedToOrderEvents,
} from "./order-submission.decision";

// Byte-format contract (review finding #15): outbox idempotency across the
// redirect-confirmed and webhook-confirmed payment paths depends on both
// producers deriving this exact string.
test("the event key format is frozen", () => {
	expect(
		buildSubmittedToOrderEventKey({
			orderId: 7,
			transactionId: 11,
			cartItemId: 3,
		}),
	).toBe("checkout:order:7:transaction:11:cartItem:3:submittedToOrder");
});

test("publishes one event per ordered item", () => {
	const events = buildSubmittedToOrderEvents({
		orderId: 7,
		cartId: 5,
		transactionId: 11,
		actor: { source: "system", actorReference: "mercadopago" },
		pairs: [
			{ cartItemId: 3, quantity: "12.5", userOrderItemId: 41 },
			{ cartItemId: 4, quantity: "100", userOrderItemId: 42 },
		],
	});

	expect(events).toHaveLength(2);
	expect(events[0]).toEqual({
		type: "cart.item.submittedToOrder",
		eventKey: "checkout:order:7:transaction:11:cartItem:3:submittedToOrder",
		aggregateType: "CartItem",
		aggregateId: "3",
		actor: { source: "system", actorReference: "mercadopago" },
		payload: {
			cartItemId: "3",
			cartId: "5",
			orderId: "7",
			userOrderItemId: "41",
			transactionId: "11",
			quantity: "12.5",
		},
	});
	expect(events[1]?.eventKey).toBe(
		"checkout:order:7:transaction:11:cartItem:4:submittedToOrder",
	);
});

test("carries either actor variant through untouched", () => {
	const [systemEvent] = buildSubmittedToOrderEvents({
		orderId: 1,
		cartId: 1,
		transactionId: 1,
		actor: { source: "system", actorReference: "mercadopago" },
		pairs: [{ cartItemId: 1, quantity: "1", userOrderItemId: 1 }],
	});
	const [userEvent] = buildSubmittedToOrderEvents({
		orderId: 1,
		cartId: 1,
		transactionId: 1,
		actor: { source: "user", actorId: "user_123" },
		pairs: [{ cartItemId: 1, quantity: "1", userOrderItemId: 1 }],
	});

	expect(systemEvent?.actor).toEqual({
		source: "system",
		actorReference: "mercadopago",
	});
	expect(userEvent?.actor).toEqual({ source: "user", actorId: "user_123" });
});

test("every payload value is a string", () => {
	const [event] = buildSubmittedToOrderEvents({
		orderId: 7,
		cartId: 5,
		transactionId: 11,
		actor: { source: "user", actorId: "user_123" },
		pairs: [{ cartItemId: 3, quantity: "12.5", userOrderItemId: 41 }],
	});

	for (const value of Object.values(event?.payload ?? {})) {
		expect(typeof value).toBe("string");
	}
});

test("no ordered items means no events", () => {
	expect(
		buildSubmittedToOrderEvents({
			orderId: 7,
			cartId: 5,
			transactionId: 11,
			actor: { source: "user", actorId: "user_123" },
			pairs: [],
		}),
	).toEqual([]);
});
