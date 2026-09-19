import { expect, test } from "vitest";

import { customerNoticeReason } from "./tracking-display";

test("an exception carries the admin reason", () => {
	expect(
		customerNoticeReason("fulfillmentException", { reason: "Camión demorado" }),
	).toBe("Camión demorado");
});

test("both roll over creations carry the admin reason", () => {
	for (const eventType of [
		"rolledOverPreAllocation",
		"rolledOverPostAllocation",
	] as const) {
		expect(
			customerNoticeReason(eventType, {
				reason: "Faltante del proveedor",
				domainEventId: 7,
			}),
		).toBe("Faltante del proveedor");
	}
});

// Same `rollover` notice kind, but the reason is an internal operator note.
test("a roll over resolution and an operation compensation never carry a reason", () => {
	expect(
		customerNoticeReason("rollOverResolved", { reason: "Cerrado a mano" }),
	).toBeUndefined();
	expect(
		customerNoticeReason("excludedFromOperation", {
			reason: "Reejecucion de la operacion OP-1",
		}),
	).toBeUndefined();
});

test("resolved, info and quantity notices never carry a reason", () => {
	for (const eventType of [
		"exceptionResolved",
		"arrivedAtPickupPoint",
		"cartItemQuantityChanged",
	] as const) {
		expect(customerNoticeReason(eventType, { reason: "x" })).toBeUndefined();
	}
});

test("missing, blank or non-string reasons are dropped", () => {
	expect(customerNoticeReason("fulfillmentException", null)).toBeUndefined();
	expect(customerNoticeReason("fulfillmentException", {})).toBeUndefined();
	expect(
		customerNoticeReason("fulfillmentException", { reason: "  " }),
	).toBeUndefined();
	expect(
		customerNoticeReason("fulfillmentException", { reason: 3 }),
	).toBeUndefined();
});
