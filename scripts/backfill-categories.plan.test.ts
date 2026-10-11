import { describe, expect, it } from "vitest";

import {
	type BackfillCatalogProduct,
	type BackfillInput,
	type BackfillProduct,
	planCategoryBackfill,
} from "./backfill-categories.plan";
import { CATALOG_CATEGORY_NAMES } from "./lib/catalog-categories";
import { resolveQuintalCategory } from "./quintal-catalog.categories";
import { quintalCatalog } from "./quintal-catalog.data";

const QUINTAL = 7;
const DEMO_SUPPLIER = 3;

const categories = CATALOG_CATEGORY_NAMES.map((name, index) => ({
	id: index + 1,
	name,
	deleted: false,
}));

const catalog: BackfillCatalogProduct[] = [
	{
		key: "semillas--pinones",
		name: "Piñones",
		heading: "SEMILLAS",
		categoryName: "Frutos secos",
	},
	{
		key: "otros--maca-negra",
		name: "Maca negra",
		heading: "OTROS",
		categoryName: "Suplementos",
	},
];

function product(
	id: number,
	name: string,
	overrides: Partial<BackfillProduct> = {},
): BackfillProduct {
	return {
		id,
		name,
		categoryId: null,
		defaultSupplierId: QUINTAL,
		...overrides,
	};
}

function input(overrides: Partial<BackfillInput> = {}): BackfillInput {
	return {
		products: [product(1, "Piñones"), product(2, "Maca negra")],
		categories,
		quintalSupplierIds: [QUINTAL],
		catalog,
		force: false,
		...overrides,
	};
}

describe("planCategoryBackfill", () => {
	it("assigns each Quintal product its catalog category", () => {
		const plan = planCategoryBackfill(input());

		expect(plan.decisions).toEqual([
			expect.objectContaining({
				action: "assign",
				productId: 1,
				categoryName: "Frutos secos",
				categoryId: 1,
			}),
			expect.objectContaining({
				action: "assign",
				productId: 2,
				categoryName: "Suplementos",
				categoryId: 6,
			}),
		]);
		expect([...plan.assignments]).toEqual([
			[1, [1]],
			[6, [2]],
		]);
		expect(plan.assignedPerCategory).toEqual([
			{ name: "Frutos secos", count: 1 },
			{ name: "Mixes y snacks", count: 0 },
			{ name: "Frutas desecadas", count: 0 },
			{ name: "Semillas y granola", count: 0 },
			{ name: "Aceites y despensa", count: 0 },
			{ name: "Suplementos", count: 1 },
		]);
		expect(plan.leftWithoutCategory).toBe(0);
	});

	it("matches names regardless of case and accents", () => {
		const plan = planCategoryBackfill(
			input({ products: [product(1, "PIÑONES "), product(2, "maca Negra")] }),
		);

		expect(plan.leftWithoutCategory).toBe(0);
	});

	it("reports demo and foreign products instead of guessing", () => {
		const plan = planCategoryBackfill(
			input({
				products: [
					product(10, "Tomate perita fresco", {
						defaultSupplierId: DEMO_SUPPLIER,
					}),
					product(11, "Piñones", { defaultSupplierId: DEMO_SUPPLIER }),
					product(12, "Maca negra", { defaultSupplierId: null }),
				],
			}),
		);

		expect(plan.decisions).toEqual([
			expect.objectContaining({
				action: "unclassified",
				reason: "no está en el catálogo de Quintal",
			}),
			expect.objectContaining({
				action: "unclassified",
				reason: expect.stringContaining("no es Quintal"),
			}),
			expect.objectContaining({ action: "unclassified" }),
		]);
		expect(plan.assignments.size).toBe(0);
		expect(plan.leftWithoutCategory).toBe(3);
	});

	it("leaves an assigned category alone unless forced", () => {
		const products = [
			product(1, "Piñones", { categoryId: 4 }),
			product(2, "Maca negra", { categoryId: 6 }),
		];

		const plain = planCategoryBackfill(input({ products }));
		expect(plain.decisions.map((decision) => decision.action)).toEqual([
			"keep",
			"keep",
		]);
		expect(plain.assignments.size).toBe(0);

		const forced = planCategoryBackfill(input({ products, force: true }));
		expect(forced.decisions[0]).toMatchObject({
			action: "assign",
			categoryId: 1,
			previousCategoryId: 4,
		});
		expect(forced.decisions[1]).toMatchObject({
			action: "keep",
			reason: "ya está en esa categoría",
		});
	});

	it("never counts an unclassifiable product that has a category as missing", () => {
		const plan = planCategoryBackfill(
			input({
				products: [
					product(10, "Producto demo", { categoryId: 5, defaultSupplierId: 3 }),
				],
				force: true,
			}),
		);

		expect(plan.decisions[0]).toMatchObject({ action: "keep" });
		expect(plan.leftWithoutCategory).toBe(0);
	});

	it("fails when a target category is missing", () => {
		expect(() =>
			planCategoryBackfill(
				input({
					categories: categories.filter(
						(category) => category.name !== "Suplementos",
					),
				}),
			),
		).toThrow('falta la categoría "Suplementos"');
	});

	it("classifies the whole Quintal catalog into the reviewed totals", () => {
		const plan = planCategoryBackfill({
			products: quintalCatalog.products.map((entry, index) =>
				product(index + 1, entry.name),
			),
			categories,
			quintalSupplierIds: [QUINTAL],
			catalog: quintalCatalog.products.map((entry) => ({
				key: entry.key,
				name: entry.name,
				heading: entry.category,
				categoryName: resolveQuintalCategory(entry),
			})),
			force: false,
		});

		expect(plan.leftWithoutCategory).toBe(0);
		expect(plan.assignedPerCategory).toEqual([
			{ name: "Frutos secos", count: 24 },
			{ name: "Mixes y snacks", count: 15 },
			{ name: "Frutas desecadas", count: 21 },
			{ name: "Semillas y granola", count: 8 },
			{ name: "Aceites y despensa", count: 15 },
			{ name: "Suplementos", count: 5 },
		]);
	});
});
