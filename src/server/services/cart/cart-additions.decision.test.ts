import { expect, test } from "vitest";
import type { CatalogClientTerms } from "~/shared/common/catalog.types";
import { planCartAdditions } from "./cart-additions.decision";

function terms(
	overrides: Partial<CatalogClientTerms> = {},
): CatalogClientTerms {
	return {
		id: 50,
		moq: "0.5",
		moqPrice: "11300",
		step: "0.5",
		stepPrice: null,
		max: "5",
		unitPrice: "22600",
		marketPrice: null,
		discountPercent: null,
		currency: "ARS",
		fromDate: new Date("2026-01-01T00:00:00.000Z"),
		toDate: null,
		...overrides,
	};
}

function plan(
	requests: { productId: number; quantity: string }[],
	options: {
		terms?: CatalogClientTerms | null;
		existing?: [number, string][];
	} = {},
) {
	const productTerms = options.terms === undefined ? terms() : options.terms;
	return planCartAdditions({
		requests,
		termsByProductId: new Map(productTerms ? [[1, productTerms]] : []),
		existingQuantityByTermsId: new Map(options.existing ?? []),
	});
}

test("a new product at an allowed quantity is added as is", () => {
	expect(plan([{ productId: 1, quantity: "1.5" }])).toEqual([
		{ productId: 1, termsId: 50, quantity: "1.5", outcome: "added" },
	]);
});

test("a quantity off the step is fitted to it", () => {
	expect(plan([{ productId: 1, quantity: "0.7" }])).toEqual([
		{ productId: 1, termsId: 50, quantity: "1", outcome: "adjusted" },
	]);
});

test("a product already in the cart grows by the requested quantity", () => {
	expect(
		plan([{ productId: 1, quantity: "1" }], { existing: [[50, "0.5"]] }),
	).toEqual([{ productId: 1, termsId: 50, quantity: "1.5", outcome: "added" }]);
});

test("the sum is capped at the maximum", () => {
	expect(
		plan([{ productId: 1, quantity: "3" }], { existing: [[50, "4"]] }),
	).toEqual([
		{ productId: 1, termsId: 50, quantity: "5", outcome: "adjusted" },
	]);
});

test("a fixed quantity always lands on the minimum", () => {
	expect(
		plan([{ productId: 1, quantity: "3" }], {
			terms: terms({ step: null, max: null }),
		}),
	).toEqual([
		{ productId: 1, termsId: 50, quantity: "0.5", outcome: "adjusted" },
	]);
});

test("a product without current terms is unavailable", () => {
	expect(plan([{ productId: 1, quantity: "1" }], { terms: null })).toEqual([
		{ productId: 1, outcome: "unavailable" },
	]);
});

test("the same product requested twice is added once with both quantities", () => {
	expect(
		plan([
			{ productId: 1, quantity: "0.5" },
			{ productId: 1, quantity: "1" },
		]),
	).toEqual([{ productId: 1, termsId: 50, quantity: "1.5", outcome: "added" }]);
});
