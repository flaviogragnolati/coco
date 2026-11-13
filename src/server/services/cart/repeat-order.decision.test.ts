import { expect, test } from "vitest";
import { collectRepeatLines, decideRepeatGate } from "./repeat-order.decision";

const snapshot = (id: unknown, name: string) => ({
	product: { id, name, unit: "kg" },
});

test("a product bought under two terms becomes one line with both quantities", () => {
	expect(
		collectRepeatLines([
			{ quantity: "0.5", productSnapshot: snapshot(1, "Almendra") },
			{ quantity: "1", productSnapshot: snapshot(1, "Almendra") },
		]),
	).toEqual([
		{
			productId: 1,
			name: "Almendra",
			quantity: "1.5",
			productSnapshot: snapshot(1, "Almendra"),
		},
	]);
});

test("a line without a product id stays on its own", () => {
	const lines = collectRepeatLines([
		{ quantity: "1", productSnapshot: snapshot(undefined, "Viejo") },
		{ quantity: "2", productSnapshot: snapshot(undefined, "Viejo") },
	]);

	expect(lines.map((line) => [line.productId, line.quantity])).toEqual([
		[null, "1"],
		[null, "2"],
	]);
});

test("lines keep the order of their first appearance", () => {
	const lines = collectRepeatLines([
		{ quantity: "1", productSnapshot: snapshot(3, "Nuez") },
		{ quantity: "1", productSnapshot: snapshot(1, "Almendra") },
		{ quantity: "1", productSnapshot: snapshot(3, "Nuez") },
		{ quantity: "1", productSnapshot: snapshot(2, "Dátil") },
	]);

	expect(lines.map((line) => line.name)).toEqual(["Nuez", "Almendra", "Dátil"]);
	expect(lines[0]?.quantity).toBe("2");
});

test("a pending order is refused before anything else", () => {
	expect(
		decideRepeatGate({ orderStatus: "pending", hasWaitingOrder: true }),
	).toBe("orderPending");
});

test("another order waiting for its payment refuses the repeat", () => {
	expect(
		decideRepeatGate({ orderStatus: "completed", hasWaitingOrder: true }),
	).toBe("waitingOrder");
});

test("with nothing waiting the order can be repeated", () => {
	expect(
		decideRepeatGate({ orderStatus: "cancelled", hasWaitingOrder: false }),
	).toBe("allowed");
});
