import { expect, test } from "vitest";
import type { CartItemFulfillmentStatus } from "~/prisma/client";
import {
	deriveUserOrderClosure,
	terminalFulfillmentStatuses,
} from "./user-order-closure";

function closure(
	itemStatuses: CartItemFulfillmentStatus[],
	currentStatus: Parameters<
		typeof deriveUserOrderClosure
	>[0]["currentStatus"] = "processing",
) {
	return deriveUserOrderClosure({ currentStatus, itemStatuses });
}

test("terminal demand is delivered or cancelled, and nothing else", () => {
	expect([...terminalFulfillmentStatuses].sort()).toEqual([
		"cancelled",
		"delivered",
	]);
});

test("an order whose items are all delivered completes", () => {
	expect(closure(["delivered", "delivered"])).toBe("completed");
});

test("a partly cancelled order still completes if anything was delivered", () => {
	expect(closure(["delivered", "cancelled"])).toBe("completed");
});

test("an order whose items were all cancelled is cancelled", () => {
	expect(closure(["cancelled", "cancelled"])).toBe("cancelled");
});

test("a rolled-over item keeps the order open — the customer is still owed it", () => {
	expect(closure(["delivered", "rolledOver"])).toBeNull();
});

test("any item still in flight keeps the order open", () => {
	expect(closure(["delivered", "atWarehouse"])).toBeNull();
});

test("the roll-up only ever writes from processing, so payment outcomes are safe", () => {
	for (const currentStatus of [
		"refunded",
		"chargedBack",
		"failed",
		"completed",
		"cancelled",
		"pending",
	] as const) {
		expect(closure(["delivered", "delivered"], currentStatus)).toBeNull();
	}
});

test("an order with no items is left alone", () => {
	expect(closure([])).toBeNull();
});
