import { expect, test } from "vitest";
import type { CartSnapshot } from "./cart.types";
import { buildCartSnapshot } from "./commerce.helpers";

const meta = { id: 7, code: "CART-7", status: "pending" } as const;

function item(
	name: string,
	quantity: string,
	lineTotal: string,
	currency: CartSnapshot["totals"][number]["currency"],
): CartSnapshot["items"][number] {
	return {
		productClientTermsId: 1,
		quantity,
		lineTotal,
		product: {
			id: 1,
			name,
			description: null,
			unit: "kg",
			brandName: null,
			imageUrl: null,
		},
		terms: {
			id: 1,
			moq: "1",
			moqPrice: lineTotal,
			step: null,
			stepPrice: null,
			max: null,
			refPrice: null,
			currency,
			fromDate: new Date("2026-01-01T00:00:00.000Z"),
			toDate: null,
		},
	};
}

test("an empty cart has no totals", () => {
	const snapshot = buildCartSnapshot([], meta);

	expect(snapshot.itemCount).toBe(0);
	expect(snapshot.totalQuantity).toBe("0");
	expect(snapshot.totals).toEqual([]);
});

test("carries the meta through untouched", () => {
	const snapshot = buildCartSnapshot([], meta);

	expect(snapshot.id).toBe(7);
	expect(snapshot.code).toBe("CART-7");
	expect(snapshot.status).toBe("pending");
});

test("sums items sharing a currency into one total", () => {
	const snapshot = buildCartSnapshot(
		[item("Arroz", "2", "100.00", "ARS"), item("Fideos", "3", "50.50", "ARS")],
		meta,
	);

	expect(snapshot.itemCount).toBe(2);
	expect(snapshot.totalQuantity).toBe("5");
	expect(snapshot.totals).toEqual([{ currency: "ARS", amount: "150.50" }]);
});

test("buckets each currency separately, first-seen first", () => {
	const snapshot = buildCartSnapshot(
		[item("Arroz", "1", "100.00", "USD"), item("Fideos", "1", "20.00", "ARS")],
		meta,
	);

	expect(snapshot.totals).toEqual([
		{ currency: "USD", amount: "100.00" },
		{ currency: "ARS", amount: "20.00" },
	]);
});

test("preserves the caller's item order", () => {
	const snapshot = buildCartSnapshot(
		[
			item("Zanahoria", "1", "10.00", "ARS"),
			item("Arroz", "1", "10.00", "ARS"),
		],
		meta,
	);

	expect(snapshot.items.map((entry) => entry.product.name)).toEqual([
		"Zanahoria",
		"Arroz",
	]);
});
