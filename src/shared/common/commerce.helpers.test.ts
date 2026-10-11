import { expect, test } from "vitest";
import type { CartSnapshot } from "./cart.types";
import type { CatalogClientTerms } from "./catalog.types";
import {
	buildCartSnapshot,
	calculateLineTotal,
	formatCurrency,
	formatQuantity,
	formatQuantityInput,
	formatUnitLabel,
	getMarketSaving,
	getPerUnitPrice,
	isFixedQuantity,
	normalizeCartQuantity,
	PricingConfigurationError,
	parseQuantityInput,
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
			presentationContainer: null,
			presentationSize: null,
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
	["without a step", { moq: "12" }, true],
	[
		"with a max that leaves no step above the minimum",
		{ moq: "12", step: "6", max: "17" },
		true,
	],
	["with a step and no max", { moq: "12", step: "6" }, false],
	[
		"with room for one step below the max",
		{ moq: "12", step: "6", max: "18" },
		false,
	],
] as const)("isFixedQuantity: %s", (_name, overrides, expected) => {
	expect(isFixedQuantity(terms(overrides))).toBe(expected);
});

test.each([
	[
		"at the minimum it is the unit price times the minimum",
		"100",
		{ moq: "100", unitPrice: "5" },
		"500.00",
	],
	[
		"below the minimum it is still the minimum's price",
		"40",
		{ moq: "100", unitPrice: "5" },
		"500.00",
	],
	[
		"above the minimum it is the unit price times the quantity",
		"1000",
		{ moq: "100", unitPrice: "5", step: "10" },
		"5000.00",
	],
	[
		"half a kilo steps price each half",
		"1.5",
		{ moq: "0.5", unitPrice: "19500", step: "0.5" },
		"29250.00",
	],
	[
		"a quantity off the step grid is priced at the next allowed one",
		"1.2",
		{ moq: "0.5", unitPrice: "19500", step: "0.5" },
		"29250.00",
	],
	[
		"stored minimum and step prices never override the unit price",
		"3",
		{
			moq: "1",
			moqPrice: "999",
			unitPrice: "100",
			step: "1",
			stepPrice: "1",
		},
		"300.00",
	],
	[
		"without a step every quantity is priced as the minimum",
		"1000",
		{ moq: "100", unitPrice: "5" },
		"500.00",
	],
	[
		"legacy terms without a unit price derive it from the minimum",
		"1000",
		{ moq: "100", moqPrice: "500", step: "10", stepPrice: "50" },
		"5000.00",
	],
	[
		"a discount comes off the unit price",
		"1000",
		{ moq: "100", unitPrice: "5", step: "10", discountPercent: "25" },
		"3750.00",
	],
	[
		"a discount on half kilos",
		"1.5",
		{ moq: "0.5", unitPrice: "19500", step: "0.5", discountPercent: "10" },
		"26325.00",
	],
	[
		"a zero discount prices exactly like no discount",
		"1000",
		{ moq: "100", unitPrice: "5", step: "10", discountPercent: "0" },
		"5000.00",
	],
	[
		"a null discount prices exactly like no discount",
		"1000",
		{ moq: "100", unitPrice: "5", step: "10", discountPercent: null },
		"5000.00",
	],
] as const)("calculateLineTotal: %s", (_name, quantity, overrides, expected) => {
	expect(calculateLineTotal(terms(overrides), quantity)).toBe(expected);
});

test("calculateLineTotal refuses terms with no price to multiply by", () => {
	expect(() =>
		calculateLineTotal(
			terms({ moq: "0", moqPrice: "500", unitPrice: null }),
			"10",
		),
	).toThrow(PricingConfigurationError);
	expect(() =>
		calculateLineTotal(
			terms({ moqPrice: "invalid", unitPrice: null, discountPercent: "25" }),
			"10",
		),
	).toThrow(PricingConfigurationError);
});

test.each([
	["a half step accepts one and a half", "1.5", "1.5"],
	["a half step rounds a quantity up to the next half", "1.2", "1.5"],
	["a half step clamps below the minimum", "0.2", "0.5"],
	["a whole quantity stays a valid multiple", "2", "2"],
] as const)("normalizeCartQuantity on half kilos: %s", (_name, quantity, expected) => {
	expect(
		normalizeCartQuantity(quantity, terms({ moq: "0.5", step: "0.5" })),
	).toBe(expected);
});

const frasco = {
	presentationContainer: "frasco",
	presentationSize: "370 g",
} as const;

test.each([
	["one jar", "1", "piece", frasco, "1 frasco 370 g"],
	["two jars", "2", "piece", frasco, "2 frascos 370 g"],
	[
		"one can",
		"1",
		"piece",
		{ presentationContainer: "bidon", presentationSize: "5 L" },
		"1 bidón 5 L",
	],
	[
		"two cans",
		"2",
		"piece",
		{ presentationContainer: "bidon", presentationSize: "5 L" },
		"2 bidones 5 L",
	],
	[
		"a bag without size",
		"1",
		"piece",
		{ presentationContainer: "bolsa", presentationSize: null },
		"1 bolsa",
	],
	[
		"bags without size",
		"3",
		"piece",
		{ presentationContainer: "bolsa", presentationSize: "" },
		"3 bolsas",
	],
	["one unit without presentation", "1", "piece", null, "1 unidad"],
	["units without presentation", "16", "piece", null, "16 unidades"],
	["boxes", "3", "box", undefined, "3 cajas"],
	["half kilos", "1.5", "kg", undefined, "1,5 kg"],
	["one kilo", "1", "kg", undefined, "1 kg"],
	["weight ignores a stray presentation", "0.5", "kg", frasco, "0,5 kg"],
	[
		"a size without container falls back to the unit",
		"2",
		"piece",
		{ presentationContainer: null, presentationSize: "370 g" },
		"2 unidades",
	],
] as const)("formatQuantity: %s", (_name, value, unit, presentation, expected) => {
	expect(formatQuantity(value, unit, presentation)).toBe(expected);
});

test("formatUnitLabel is the noun alone, agreeing with the quantity", () => {
	expect(formatUnitLabel("1", "piece", frasco)).toBe("frasco 370 g");
	expect(formatUnitLabel("2", "piece", frasco)).toBe("frascos 370 g");
	expect(formatUnitLabel("0.5", "kg")).toBe("kg");
	expect(formatUnitLabel("12", "other")).toBe("unidades");
});

test.each([
	["a decimal comma", "1,5", 1.5],
	["a decimal dot", "1.5", 1.5],
	["a whole number", "2", 2],
	["surrounding spaces", " 0,5 ", 0.5],
	["a leading comma", ",5", 0.5],
	["es-AR grouping with a decimal comma", "1.000,5", 1000.5],
	["several dots as grouping", "1.000.000", 1000000],
	["empty input", "", null],
	["letters", "uno", null],
	["two commas", "1,5,0", null],
	["a negative sign", "-1", null],
] as const)("parseQuantityInput: %s", (_name, text, expected) => {
	expect(parseQuantityInput(text)).toBe(expected);
});

test("a typed decimal comma reaches the half-kilo grid", () => {
	const halves = terms({ moq: "0.5", step: "0.5" });
	const parsed = parseQuantityInput("1,5");

	expect(parsed).not.toBeNull();
	expect(normalizeCartQuantity(parsed ?? 0, halves)).toBe("1.5");
});

test("formatQuantityInput shows es-AR decimals without grouping", () => {
	expect(formatQuantityInput("1.5")).toBe("1,5");
	expect(formatQuantityInput("1500")).toBe("1500");
	expect(formatQuantityInput("0.5000")).toBe("0,5");
	expect(parseQuantityInput(formatQuantityInput("1234.5"))).toBe(1234.5);
});
