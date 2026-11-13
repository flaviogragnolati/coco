import { expect, test } from "vitest";
import type { CatalogClientTerms } from "~/shared/common/catalog.types";
import {
	getInitialPurchaseQuantity,
	getPurchasePanelMode,
	getPurchasePrice,
	showsQuantityUnit,
	toOfferPricing,
} from "./purchase-panel";

const terms: CatalogClientTerms = {
	id: 9,
	moq: "0.5",
	moqPrice: "9750",
	step: "0.5",
	stepPrice: "9750",
	max: null,
	unitPrice: "19500",
	marketPrice: null,
	discountPercent: null,
	currency: "ARS",
	fromDate: new Date("2026-10-01"),
	toDate: null,
};

const loose = { presentationContainer: null, presentationSize: null };
const jar = {
	presentationContainer: "frasco",
	presentationSize: "370 g",
} as const;

test("the price line is the step price, with the price per kg below it", () => {
	expect(getPurchasePrice(toOfferPricing(terms, "kg", loose))).toEqual({
		amount: "$ 9.750",
		unitLabel: "por 500 g",
		previousAmount: null,
		discount: null,
		comparison: {
			amount: "$ 19.500",
			measureLabel: "/ kg",
			spokenLabel: "por kg",
		},
		saving: null,
	});
	const jars = toOfferPricing(
		{ ...terms, moq: "1", step: "1", unitPrice: "4200" },
		"piece",
		jar,
	);
	expect(getPurchasePrice(jars)).toMatchObject({
		amount: "$ 4.200",
		unitLabel: "por frasco",
		comparison: { amount: "$ 11.351", measureLabel: "/ kg" },
	});
});

test("a whole kilo step still has its comparison line", () => {
	expect(
		getPurchasePrice(
			toOfferPricing({ ...terms, moq: "1", step: "1" }, "kg", loose),
		).comparison,
	).toMatchObject({ measureLabel: "/ kg" });
});

test("a discount strikes through the undiscounted step price", () => {
	expect(
		getPurchasePrice(
			toOfferPricing({ ...terms, discountPercent: "20" }, "kg", loose),
		),
	).toMatchObject({
		amount: "$ 7.800",
		previousAmount: "$ 9.750",
		discount: "-20%",
		comparison: { amount: "$ 15.600" },
	});
});

test("the panel offers the stepper, a fixed quantity, or the order's quantity", () => {
	expect(getPurchasePanelMode(terms, null)).toBe("stepper");
	expect(getPurchasePanelMode({ ...terms, step: null }, null)).toBe("fixed");
	expect(getPurchasePanelMode({ ...terms, max: "0.5" }, null)).toBe("fixed");
	expect(getPurchasePanelMode(terms, "1.5")).toBe("in-cart");
	expect(getPurchasePanelMode({ ...terms, step: null }, "0.5")).toBe("in-cart");
});

test("the selection starts at the minimum the terms allow", () => {
	expect(getInitialPurchaseQuantity(terms)).toBe("0.5");
	expect(getInitialPurchaseQuantity({ ...terms, moq: "3", step: "2" })).toBe(
		"3",
	);
});

test.each([
	["kg", true],
	["gr", true],
	["lb", true],
	["piece", false],
	["box", false],
] as const)("the quantity field names the unit for %s: %s", (unit, expected) => {
	expect(showsQuantityUnit(unit)).toBe(expected);
});
