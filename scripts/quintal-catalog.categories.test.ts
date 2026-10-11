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
			"Frutos secos": 24,
			"Mixes y snacks": 15,
			"Frutas desecadas": 21,
			"Semillas y granola": 8,
			"Aceites y despensa": 15,
			Suplementos: 5,
		});
	});

	it("lets a product exception win over its heading", () => {
		expect(namesIn("Frutos secos")).toContain("Piñones");
		expect(namesIn("Mixes y snacks")).toEqual(
			expect.arrayContaining([
				"Bocaditos",
				"Nuez pecán garapiñada 500 g",
				"Maní bañado en chocolate semiamargo",
			]),
		);
		expect(namesIn("Aceites y despensa")).toEqual(
			expect.arrayContaining([
				"Pasta de maní Entre Nuts 370 g",
				"Harina de coco",
				"Aceite de coco virgen Entre Nuts 200 cc",
			]),
		);
		expect(namesIn("Suplementos")).not.toContain("Bocaditos");
	});

	it("returns null for a heading nobody mapped", () => {
		expect(
			resolveQuintalCategory({ key: "nuevo--producto", category: "NUEVO" }),
		).toBeNull();
	});

	it("keeps no stale heading or product key", () => {
		const headings = new Set(products.map((product) => product.category));
		const keys = new Set(products.map((product) => product.key));

		expect(
			Object.keys(quintalCategoryOverrides.categoryMap).filter(
				(heading) => !headings.has(heading),
			),
		).toEqual([]);
		expect(
			Object.keys(quintalCategoryOverrides.categoryExceptions).filter(
				(key) => !keys.has(key),
			),
		).toEqual([]);
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
