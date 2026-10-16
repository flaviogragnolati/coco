import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CATALOG_CATEGORY_NAMES } from "./lib/catalog-categories";
import { resolveQuintalCategory } from "./quintal-catalog.categories";
import { quintalCatalog } from "./quintal-catalog.data";
import { quintalCategoryOverrides } from "./quintal-catalog.overrides";

const products = quintalCatalog.products;

function namesIn(category: string) {
	return products
		.filter((product) => resolveQuintalCategory(product) === category)
		.map((product) => product.name);
}

describe("resolveQuintalCategory", () => {
	it("classifies every catalog product", () => {
		const unclassified = products
			.filter((product) => resolveQuintalCategory(product) === null)
			.map((product) => product.key);

		expect(unclassified).toEqual([]);
	});

	it("produces the reviewed totals per category", () => {
		const totals = Object.fromEntries(
			CATALOG_CATEGORY_NAMES.map((name) => [name, namesIn(name).length]),
		);

		expect(totals).toEqual({
			"Frutos secos": 9,
			"Mixes y snacks": 4,
			"Frutas desecadas": 6,
			"Semillas y granola": 3,
			"Aceites y despensa": 5,
			Suplementos: 0,
		});
	});

	it("keeps legacy heading mappings and exceptions usable", () => {
		expect(
			resolveQuintalCategory({
				key: "semillas--pinones",
				category: "SEMILLAS",
			}),
		).toBe("Frutos secos");
		expect(
			resolveQuintalCategory({ key: "otros--bocaditos", category: "OTROS" }),
		).toBe("Mixes y snacks");
		for (const [category, name] of Object.entries(
			quintalCategoryOverrides.categoryMap,
		))
			expect(resolveQuintalCategory({ key: "legacy--fixture", category })).toBe(
				name,
			);
	});

	it("returns null for a heading nobody mapped", () => {
		expect(
			resolveQuintalCategory({ key: "nuevo--producto", category: "NUEVO" }),
		).toBeNull();
	});
});

describe("category migration", () => {
	it("inserts exactly the catalog categories, in display order", () => {
		const sql = readFileSync(
			new URL(
				"../prisma/migrations/20261011100000_category/migration.sql",
				import.meta.url,
			),
			"utf8",
		);
		const inserted = [...sql.matchAll(/\('([^']+)', (\d+)\)/g)].map(
			([, name, order]) => [name, Number(order)],
		);

		expect(inserted).toEqual(
			CATALOG_CATEGORY_NAMES.map((name, index) => [name, index + 1]),
		);
	});
});
