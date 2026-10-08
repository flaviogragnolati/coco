import { describe, expect, it } from "vitest";

import { Prisma } from "~/prisma/client";
import { quintalCatalog } from "./quintal-catalog.data";
import { normalizeText, quintalCatalogSchema } from "./quintal-catalog.schema";

const products = quintalCatalog.products;
const decimal = (value: string) => new Prisma.Decimal(value);

describe("quintal catalog data", () => {
	it("validates against the catalog schema", () => {
		expect(quintalCatalogSchema.safeParse(quintalCatalog).success).toBe(true);
	});

	it("pins the product count, OTROS included", () => {
		expect(products).toHaveLength(88);
		expect(
			products.filter((product) => product.category === "OTROS"),
		).toHaveLength(6);
	});

	it("has unique keys and case-insensitively unique names", () => {
		expect(new Set(products.map((product) => product.key)).size).toBe(
			products.length,
		);
		expect(
			new Set(products.map((product) => normalizeText(product.name))).size,
		).toBe(products.length);
	});

	it("records list prices in ARS without VAT", () => {
		expect(quintalCatalog.source.pricesIncludeVat).toBe(false);
		expect(quintalCatalog.source.currency).toBe("ARS");
	});

	it.each(
		products.map((product) => [product.key, product] as const),
	)("%s: supplier terms are one whole pack priced as listed", (_key, product) => {
		const terms = product.supplierTerms;

		expect(decimal(terms.moq).gt(0)).toBe(true);
		expect(terms.step).toBe(terms.moq);
		expect(terms.stepPrice).toBe(terms.moqPrice);
		expect(
			decimal(terms.refPrice)
				.times(terms.moq)
				.minus(terms.moqPrice)
				.abs()
				.lte("0.5"),
		).toBe(true);
		if (terms.priceSource === "derived") {
			expect(
				quintalCatalog.notes.some((note) => note.row === terms.sourceRow),
			).toBe(true);
		}
	});

	it.each(
		products.map((product) => [product.key, product] as const),
	)("%s: the customer pays the list price per kg or unit, from 1", (_key, product) => {
		const terms = product.clientTerms;

		expect(terms.unitPrice).toBe(product.supplierTerms.refPrice);
		expect(terms.moq).toBe("1.0000");
		expect(terms.step).toBe("1.0000");
		expect(terms.max).toBeNull();
		expect(decimal(terms.unitPrice).times(terms.moq).eq(terms.moqPrice)).toBe(
			true,
		);
		expect(decimal(terms.unitPrice).times(terms.step).eq(terms.stepPrice)).toBe(
			true,
		);
	});

	it("never prices a volume tier above the list price", () => {
		for (const product of products) {
			for (const tier of product.bulkTiers) {
				expect(
					decimal(tier.unitPrice).lte(product.supplierTerms.refPrice),
				).toBe(true);
			}
		}
	});

	it("keeps promo and reference-price wording out of the descriptions", () => {
		for (const product of products) {
			expect(product.description).not.toMatch(/promo|precio de referencia/i);
		}
	});
});
