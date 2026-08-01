import { expect, test } from "vitest";
import type { CartSnapshot } from "./cart.types";
import type { CatalogClientTerms } from "./catalog.types";
import {
	buildCartSnapshot,
	calculateLineTotal,
	formatCurrency,
	formatQuantity,
	getMarketSaving,
	getPerUnitPrice,
	normalizeCartQuantity,
	PricingConfigurationError,
	selectProductImage,
} from "./commerce.helpers";

const meta = { id: 7, code: "CART-7", status: "pending" } as const;

function terms(
	overrides: Partial<CatalogClientTerms> = {},
): CatalogClientTerms {
	return {
		id: 1,
		moq: "1",
		moqPrice: "100.00",
		step: null,
		stepPrice: null,
		max: null,
		unitPrice: null,
		marketPrice: null,
		discountPercent: null,
		currency: "ARS",
		fromDate: new Date("2026-01-01T00:00:00.000Z"),
		toDate: null,
		...overrides,
	};
}

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
		terms: terms({ moqPrice: lineTotal, currency }),
	};
}

test("an empty cart has no totals", () => {
	const snapshot = buildCartSnapshot([], meta);

	expect(snapshot.itemCount).toBe(0);
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

const bothImages = { cardImageUrl: "card.jpg", cartImageUrl: "cart.jpg" };
const cardOnly = { cardImageUrl: "card.jpg", cartImageUrl: null };
const cartOnly = { cardImageUrl: null, cartImageUrl: "cart.jpg" };
const neither = { cardImageUrl: null, cartImageUrl: null };

test("selectProductImage prefers the cart image in the cart context", () => {
	expect(selectProductImage(bothImages, "cart")).toBe("cart.jpg");
	expect(selectProductImage(cardOnly, "cart")).toBe("card.jpg");
	expect(selectProductImage(cartOnly, "cart")).toBe("cart.jpg");
	expect(selectProductImage(neither, "cart")).toBeNull();
});

test("selectProductImage prefers the card image in the catalog context", () => {
	expect(selectProductImage(bothImages, "catalog")).toBe("card.jpg");
	expect(selectProductImage(cardOnly, "catalog")).toBe("card.jpg");
	expect(selectProductImage(cartOnly, "catalog")).toBe("cart.jpg");
	expect(selectProductImage(neither, "catalog")).toBeNull();
});

// The home formatters used to carry their own toNumber, which coerced "" to 0.
// The shared one returns null, so an empty value now falls through to the raw
// branch instead of rendering as zero. Latent today: every caller feeds a
// Prisma Decimal string, which is never "".
test("empty values fall through to the raw branch instead of coercing to zero", () => {
	expect(formatCurrency("", "ARS")).toBe("ARS ");
	expect(formatQuantity("", "kg")).toBe(" kg");
});

test("getPerUnitPrice prefers an explicit unit price", () => {
	expect(
		getPerUnitPrice(terms({ unitPrice: "12.5", moqPrice: "100", moq: "10" })),
	).toBe(12.5);
});

test("getPerUnitPrice derives the unit price from the minimum block", () => {
	expect(
		getPerUnitPrice(terms({ unitPrice: null, moqPrice: "100", moq: "8" })),
	).toBe(12.5);
});

test("getPerUnitPrice rejects zero and invalid minimum quantities", () => {
	expect(
		getPerUnitPrice(terms({ unitPrice: null, moqPrice: "100", moq: "0" })),
	).toBeNull();
	expect(
		getPerUnitPrice(terms({ unitPrice: null, moqPrice: "invalid", moq: "8" })),
	).toBeNull();
});

// Both branches must discount, or the catalog advertises one number and the
// cart charges another.
test("getPerUnitPrice discounts the explicit unit price", () => {
	expect(
		getPerUnitPrice(
			terms({
				unitPrice: "100",
				moqPrice: "1000",
				moq: "10",
				discountPercent: "25",
			}),
		),
	).toBe(75);
});

test("getPerUnitPrice discounts the derived unit price too", () => {
	expect(
		getPerUnitPrice(
			terms({
				unitPrice: null,
				moqPrice: "1000",
				moq: "10",
				discountPercent: "25",
			}),
		),
	).toBe(75);
});

test("getMarketSaving measures the market price against the offer price", () => {
	expect(
		getMarketSaving(
			terms({
				unitPrice: "100",
				moqPrice: "1000",
				moq: "10",
				discountPercent: "25",
				marketPrice: "150",
			}),
		),
	).toEqual({ perUnit: 75, perBlock: 750, percent: 50 });
});

test("getMarketSaving never reports a negative saving", () => {
	const notAbove = { unitPrice: "100", moqPrice: "1000", moq: "10" } as const;

	expect(getMarketSaving(terms({ ...notAbove, marketPrice: null }))).toBeNull();
	expect(
		getMarketSaving(terms({ ...notAbove, marketPrice: "100" })),
	).toBeNull();
	expect(getMarketSaving(terms({ ...notAbove, marketPrice: "80" }))).toBeNull();
});

test.each([
	["below the minimum clamps up", "5", { moq: "100" }, "100"],
	[
		"without a step every quantity collapses to the minimum",
		"450",
		{ moq: "100" },
		"100",
	],
	[
		"a step rounds up to the next multiple",
		"115",
		{ moq: "100", step: "10" },
		"120",
	],
	["an exact multiple is left alone", "120", { moq: "100", step: "10" }, "120"],
	[
		"the maximum clamps down",
		"500",
		{ moq: "100", step: "10", max: "200" },
		"200",
	],
	[
		"a maximum that is not a step multiple clamps to the last reachable step",
		"500",
		{ moq: "100", step: "10", max: "205" },
		"200",
	],
	[
		"a maximum below the minimum still wins",
		"500",
		{ moq: "100", step: "10", max: "50" },
		"50",
	],
] as const)("normalizeCartQuantity: %s", (_name, quantity, overrides, expected) => {
	expect(normalizeCartQuantity(quantity, terms(overrides))).toBe(expected);
});

test.each([
	[
		"at the minimum it is the minimum price",
		"100",
		{ moq: "100", moqPrice: "500" },
		"500.00",
	],
	[
		"below the minimum it is still the minimum price",
		"40",
		{ moq: "100", moqPrice: "500" },
		"500.00",
	],
	[
		"above the minimum each step adds its price",
		"1000",
		{ moq: "100", moqPrice: "500", step: "10", stepPrice: "50" },
		"5000.00",
	],
	[
		"a step price without a step is never applied",
		"1000",
		{ moq: "100", moqPrice: "500", stepPrice: "50" },
		"500.00",
	],
	[
		"a step without a step price still prices the minimum block",
		"100",
		{ moq: "100", moqPrice: "500", step: "10" },
		"500.00",
	],
	[
		"a discount comes off the minimum block",
		"100",
		{ moq: "100", moqPrice: "500", discountPercent: "25" },
		"375.00",
	],
	[
		"a discount comes off every step as well as the minimum",
		"1000",
		{
			moq: "100",
			moqPrice: "500",
			step: "10",
			stepPrice: "50",
			discountPercent: "25",
		},
		"3750.00",
	],
	[
		"a zero discount prices exactly like no discount",
		"1000",
		{
			moq: "100",
			moqPrice: "500",
			step: "10",
			stepPrice: "50",
			discountPercent: "0",
		},
		"5000.00",
	],
	[
		"a null discount prices exactly like no discount",
		"1000",
		{
			moq: "100",
			moqPrice: "500",
			step: "10",
			stepPrice: "50",
			discountPercent: null,
		},
		"5000.00",
	],
] as const)("calculateLineTotal: %s", (_name, quantity, overrides, expected) => {
	expect(calculateLineTotal(terms(overrides), quantity)).toBe(expected);
});

// The review's 10x-undercharge scenario: the terms let the quantity grow in
// steps but price no step, so the flat minimum price used to be returned for
// ten times the goods.
test("calculateLineTotal refuses to price a step it has no price for", () => {
	expect(() =>
		calculateLineTotal(
			terms({ moq: "100", moqPrice: "500", step: "10", stepPrice: null }),
			"1000",
		),
	).toThrow(PricingConfigurationError);
});

test("a discount does not turn the missing-step-price error into a price", () => {
	expect(() =>
		calculateLineTotal(
			terms({
				moq: "100",
				moqPrice: "500",
				step: "10",
				stepPrice: null,
				discountPercent: "25",
			}),
			"1000",
		),
	).toThrow(PricingConfigurationError);
});
