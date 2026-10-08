import { describe, expect, it } from "vitest";

import {
	type ExistingProduct,
	type ExistingSupplierTerms,
	type ExistingTerms,
	planSeedInit,
	type SeedInitCatalog,
	type SeedInitState,
} from "./seed-init.plan";

const listDate = new Date("2026-07-02T03:00:00.000Z");
const now = new Date("2026-10-08T12:00:00.000Z");

const catalog: SeedInitCatalog = {
	supplierName: "Quintal",
	listDate,
	products: [
		{ key: "almendra--guara", name: "Almendra guara" },
		{ key: "nuez--pecan", name: "Nuez pecán" },
	],
};

const emptyState: SeedInitState = {
	suppliers: [],
	products: [],
	supplierTerms: [],
	clientTerms: [],
};

const quintal = { id: 7, name: "Quintal", active: true, deleted: false };

function product(
	id: number,
	name: string,
	overrides: Partial<ExistingProduct> = {},
): ExistingProduct {
	return {
		id,
		name,
		defaultSupplierId: quintal.id,
		active: true,
		deleted: false,
		...overrides,
	};
}

function terms(
	productId: number,
	overrides: Partial<ExistingTerms> = {},
): ExistingTerms {
	return {
		productId,
		fromDate: listDate,
		toDate: null,
		active: true,
		deleted: false,
		...overrides,
	};
}

function supplierTerms(
	productId: number,
	overrides: Partial<ExistingSupplierTerms> = {},
): ExistingSupplierTerms {
	return { ...terms(productId), supplierId: quintal.id, ...overrides };
}

const loadedState: SeedInitState = {
	suppliers: [quintal],
	products: [product(1, "Almendra guara"), product(2, "Nuez pecán")],
	supplierTerms: [supplierTerms(1), supplierTerms(2)],
	clientTerms: [terms(1), terms(2)],
};

describe("planSeedInit", () => {
	it("creates the supplier and every product on an empty database", () => {
		const plan = planSeedInit(catalog, emptyState, now);

		expect(plan.supplier).toEqual({ action: "create" });
		expect(plan.products.map((decision) => decision.action)).toEqual([
			"create",
			"create",
		]);
		expect(plan.warnings).toEqual([]);
	});

	it("creates nothing on a rerun", () => {
		const plan = planSeedInit(catalog, loadedState, now);

		expect(plan.supplier).toEqual({ action: "keep", id: quintal.id });
		expect(plan.products).toEqual([
			{
				key: "almendra--guara",
				name: "Almendra guara",
				action: "keep",
				productId: 1,
				supplierTerms: { action: "keep" },
				clientTerms: { action: "keep" },
			},
			{
				key: "nuez--pecan",
				name: "Nuez pecán",
				action: "keep",
				productId: 2,
				supplierTerms: { action: "keep" },
				clientTerms: { action: "keep" },
			},
		]);
	});

	it("leaves a product an admin edited untouched and keeps its list terms", () => {
		const plan = planSeedInit(
			catalog,
			{
				...loadedState,
				products: [
					product(1, "Almendra guara", { active: false }),
					product(2, "Nuez pecán"),
				],
				clientTerms: [terms(1, { active: false }), terms(2)],
			},
			now,
		);

		expect(plan.products[0]).toMatchObject({
			action: "keep",
			productId: 1,
			supplierTerms: { action: "keep" },
			clientTerms: { action: "keep" },
		});
	});

	it("adds missing terms to an existing product", () => {
		const plan = planSeedInit(
			catalog,
			{
				...loadedState,
				supplierTerms: [supplierTerms(2)],
				clientTerms: [terms(2)],
			},
			now,
		);

		expect(plan.products[0]).toMatchObject({
			action: "keep",
			supplierTerms: { action: "create" },
			clientTerms: { action: "create" },
		});
	});

	it("skips a hand-made product with the same name and another supplier", () => {
		const plan = planSeedInit(
			catalog,
			{
				...emptyState,
				suppliers: [quintal],
				products: [product(9, "Almendra guara", { defaultSupplierId: 3 })],
			},
			now,
		);

		expect(plan.products[0]).toMatchObject({
			action: "skip",
			key: "almendra--guara",
		});
		expect(plan.products[1]).toMatchObject({ action: "create" });
	});

	it("skips a namesake with no default supplier before Quintal exists", () => {
		const plan = planSeedInit(
			catalog,
			{
				...emptyState,
				products: [product(9, "Almendra guara", { defaultSupplierId: null })],
			},
			now,
		);

		expect(plan.supplier).toEqual({ action: "create" });
		expect(plan.products[0]).toMatchObject({ action: "skip" });
	});

	it("skips terms when other current terms exist instead of replacing them", () => {
		const plan = planSeedInit(
			catalog,
			{
				...loadedState,
				supplierTerms: [
					supplierTerms(1, { fromDate: new Date("2026-09-01T03:00:00.000Z") }),
					supplierTerms(2),
				],
				clientTerms: [
					terms(1, { fromDate: new Date("2026-09-01T03:00:00.000Z") }),
					terms(2),
				],
			},
			now,
		);

		expect(plan.products[0]).toMatchObject({
			action: "keep",
			supplierTerms: { action: "skip" },
			clientTerms: { action: "skip" },
		});
	});

	it("creates terms when the other ones are expired", () => {
		const expired = {
			fromDate: new Date("2026-01-01T03:00:00.000Z"),
			toDate: new Date("2026-06-30T03:00:00.000Z"),
		};
		const plan = planSeedInit(
			catalog,
			{
				...loadedState,
				supplierTerms: [supplierTerms(1, expired), supplierTerms(2)],
				clientTerms: [terms(1, expired), terms(2)],
			},
			now,
		);

		expect(plan.products[0]).toMatchObject({
			supplierTerms: { action: "create" },
			clientTerms: { action: "create" },
		});
	});

	it("warns about an inactive supplier without updating it", () => {
		const plan = planSeedInit(
			catalog,
			{ ...loadedState, suppliers: [{ ...quintal, active: false }] },
			now,
		);

		expect(plan.supplier).toEqual({ action: "keep", id: quintal.id });
		expect(plan.warnings).toEqual([expect.stringContaining("inactivo")]);
	});

	it("reuses a deleted supplier with a warning instead of duplicating it", () => {
		const plan = planSeedInit(
			catalog,
			{ ...emptyState, suppliers: [{ ...quintal, deleted: true }] },
			now,
		);

		expect(plan.supplier).toEqual({ action: "keep", id: quintal.id });
		expect(plan.warnings).toEqual([expect.stringContaining("eliminado")]);
	});

	it("refuses to guess between two live suppliers with the catalog's name", () => {
		expect(() =>
			planSeedInit(
				catalog,
				{ ...emptyState, suppliers: [quintal, { ...quintal, id: 8 }] },
				now,
			),
		).toThrow(/2 proveedores "Quintal"/);
	});

	it("skips when Quintal's product has another namesake", () => {
		const plan = planSeedInit(
			catalog,
			{
				...loadedState,
				products: [
					product(1, "Almendra guara"),
					product(9, "Almendra guara", { defaultSupplierId: 3, deleted: true }),
					product(2, "Nuez pecán"),
				],
			},
			now,
		);

		expect(plan.products[0]).toMatchObject({
			action: "skip",
			reason: expect.stringContaining("hay 2 productos con este nombre"),
		});
	});

	it("does not resurrect a soft-deleted product", () => {
		const plan = planSeedInit(
			catalog,
			{
				...loadedState,
				products: [
					product(1, "Almendra guara", { deleted: true }),
					product(2, "Nuez pecán"),
				],
			},
			now,
		);

		expect(plan.products[0]).toMatchObject({ action: "skip" });
	});

	it("reports Quintal products whose names left the catalog", () => {
		const plan = planSeedInit(
			catalog,
			{
				...loadedState,
				products: [
					product(1, "Almendra guara premium"),
					product(2, "Nuez pecán"),
				],
			},
			now,
		);

		expect(plan.products[0]).toMatchObject({ action: "create" });
		expect(plan.warnings).toEqual([
			expect.stringContaining('"Almendra guara premium" (id 1)'),
		]);
	});
});
