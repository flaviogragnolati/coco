import { describe, expect, it } from "vitest";

import { Prisma } from "~/prisma/client";
import { launchExpected } from "./fixtures/quintal-launch.expected";
import { quintalCatalog } from "./quintal-catalog.data";
import { normalizeText, quintalCatalogSchema } from "./quintal-catalog.schema";

const products = quintalCatalog.products;
const decimal = (value: string) => new Prisma.Decimal(value);

describe("quintal catalog data", () => {
	it("validates against the catalog schema", () => {
		expect(quintalCatalogSchema.safeParse(quintalCatalog).success).toBe(true);
	});

	it("matches every approved launch product and both sets of purchase terms", () => {
		expect(
			products.map((p) => [
				p.name,
				p.unit,
				p.clientTerms.unitPrice,
				p.clientTerms.moq,
				p.supplierTerms.moq,
				p.supplierTerms.moqPrice,
			]),
		).toEqual(launchExpected);
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
	)("%s: the customer pays the final price with the explicit purchase step", (_key, product) => {
		const terms = product.clientTerms;
		const quantity = terms.moq;
		const priceOf = (amount: string) =>
			decimal(terms.unitPrice)
				.times(amount)
				.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

		expect(decimal(terms.unitPrice).gt(product.supplierTerms.refPrice)).toBe(
			true,
		);
		expect(terms.moq).toBe(quantity);
		expect(terms.step).toBe(quantity);
		expect(terms.max).toBeNull();
		expect(priceOf(terms.moq).eq(terms.moqPrice)).toBe(true);
		expect(priceOf(terms.step).eq(terms.stepPrice)).toBe(true);
	});

	it("keeps the supplier presentation as supplier data, not description", () => {
		for (const product of products) {
			expect(product.description).not.toMatch(/presentación del proveedor/i);
			expect(product.supplierTerms.supplierPresentation.length).toBeGreaterThan(
				0,
			);
		}
	});

	it("gives a presentation only to products sold by the unit", () => {
		expect(
			products.filter(
				(product) => product.unit === "kg" && product.presentation,
			),
		).toEqual([]);
		expect(
			products
				.filter((product) => product.presentation)
				.map((product) => [product.name, product.presentation]),
		).toEqual([
			[
				"Aceite de oliva extra virgen 0,5 L",
				{ presentationContainer: "botella", presentationSize: "0,5 L" },
			],
			[
				"Aceite de oliva extra virgen 1 L",
				{ presentationContainer: "botella", presentationSize: "1 L" },
			],
			[
				"Aceite de oliva extra virgen 5 L",
				{ presentationContainer: "bidon", presentationSize: "5 L" },
			],
			[
				"Pasta de maní Entre Nuts 370 g",
				{ presentationContainer: "frasco", presentationSize: "370 g" },
			],
			[
				"Sal rosada del Himalaya",
				{ presentationContainer: "bolsa", presentationSize: "1 kg" },
			],
		]);
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
