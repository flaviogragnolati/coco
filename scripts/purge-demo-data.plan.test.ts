import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
	assertApplyAllowed,
	CATALOG_DELETE_ORDER,
	DEMO_SUPPLIER_NAMES,
	KEPT_MODELS,
	type PurgeCatalogState,
	type PurgeProduct,
	type PurgeSupplier,
	parsePurgeArgs,
	planDemoPurge,
	TRANSACTIONAL_DELETE_ORDER,
} from "./purge-demo-data.plan";

const identity = {
	quintalSupplierName: "Quintal",
	demoSupplierNames: DEMO_SUPPLIER_NAMES,
};

function supplier(id: number, name: string): PurgeSupplier {
	return { id, name, active: true, deleted: false };
}

const quintal = supplier(1, "Quintal");
const valleVerde = supplier(2, "Cooperativa Valle Verde");
const packNorte = supplier(3, "Pack Norte Mayorista");

function product(
	id: number,
	name: string,
	overrides: Partial<PurgeProduct> = {},
): PurgeProduct {
	return {
		id,
		name,
		defaultSupplierId: quintal.id,
		brandId: null,
		homeOfferRank: null,
		active: true,
		deleted: false,
		...overrides,
	};
}

function state(overrides: Partial<PurgeCatalogState> = {}): PurgeCatalogState {
	return {
		suppliers: [quintal, valleVerde, packNorte],
		products: [
			product(10, "Almendra guara"),
			product(20, "Tomate perita fresco", {
				defaultSupplierId: valleVerde.id,
				brandId: 100,
				homeOfferRank: 1,
			}),
			product(21, "Mix de frutos secos discontinuado", {
				defaultSupplierId: packNorte.id,
				brandId: 101,
				active: false,
				deleted: true,
			}),
		],
		brands: [
			{ id: 100, name: "Andes Fresh" },
			{ id: 101, name: "Pampa Pack" },
		],
		supplierTerms: [
			{ id: 1000, productId: 10, supplierId: quintal.id },
			{ id: 2000, productId: 20, supplierId: valleVerde.id },
			{ id: 2001, productId: 21, supplierId: packNorte.id },
			{ id: 2002, productId: 21, supplierId: valleVerde.id },
		],
		clientTerms: [
			{ id: 1, productId: 10 },
			{ id: 2, productId: 20 },
			{ id: 3, productId: 21 },
			{ id: 4, productId: 21 },
		],
		localConstraints: [
			{ id: 7, productId: 10 },
			{ id: 8, productId: 20 },
		],
		spotlightProductId: null,
		...overrides,
	};
}

describe("planDemoPurge", () => {
	it("deletes the demo suppliers, their products, brands and rows", () => {
		const plan = planDemoPurge(identity, state());

		expect(plan.blockers).toEqual([]);
		expect(plan.quintal.suppliers.map((s) => s.id)).toEqual([quintal.id]);
		expect(plan.quintal.productIds).toEqual([10]);
		expect(plan.demo.suppliers.map((s) => s.id)).toEqual([2, 3]);
		expect(plan.demo.products.map((p) => [p.id, p.supplierName])).toEqual([
			[20, "Cooperativa Valle Verde"],
			[21, "Pack Norte Mayorista"],
		]);
		expect(plan.demo.brands.map((b) => b.id)).toEqual([100, 101]);
		expect(plan.demo.clientTermIds).toEqual([2, 3, 4]);
		expect(plan.demo.supplierTermIds).toEqual([2000, 2001, 2002]);
		expect(plan.demo.localConstraintIds).toEqual([8]);
		expect(plan.unclassified).toEqual({ suppliers: [], products: [] });
	});

	it("keeps a product Quintal supplies even when it defaults to a demo supplier", () => {
		const plan = planDemoPurge(
			identity,
			state({
				products: [
					product(10, "Almendra guara", { defaultSupplierId: valleVerde.id }),
				],
				supplierTerms: [{ id: 1000, productId: 10, supplierId: quintal.id }],
			}),
		);

		expect(plan.quintal.productIds).toEqual([10]);
		expect(plan.demo.products).toEqual([]);
		// The kept product still defaults to Valle Verde, so it cannot go.
		expect(plan.demo.suppliers.map((s) => s.id)).toEqual([packNorte.id]);
		expect(plan.unclassified.suppliers).toEqual([
			{
				id: valleVerde.id,
				name: valleVerde.name,
				reason: "es demo pero lo usan productos que no se borran (ids 10)",
			},
		]);
		expect(plan.demo.clientTermIds).toEqual([]);
	});

	it("leaves a product with no default supplier unclassified", () => {
		const plan = planDemoPurge(
			identity,
			state({
				products: [product(30, "Huérfano", { defaultSupplierId: null })],
			}),
		);

		expect(plan.demo.products).toEqual([]);
		expect(plan.quintal.productIds).toEqual([]);
		expect(plan.unclassified.products).toEqual([
			{ id: 30, name: "Huérfano", reason: "no tiene proveedor por defecto" },
		]);
	});

	it("keeps a supplier that is neither Quintal nor demo, and its products", () => {
		const real = supplier(4, "Proveedor real");
		const plan = planDemoPurge(
			identity,
			state({
				suppliers: [quintal, real],
				products: [product(40, "Producto real", { defaultSupplierId: 4 })],
				supplierTerms: [{ id: 4000, productId: 40, supplierId: 4 }],
			}),
		);

		expect(plan.demo.suppliers).toEqual([]);
		expect(plan.demo.products).toEqual([]);
		expect(plan.demo.supplierTermIds).toEqual([]);
		expect(plan.unclassified.suppliers).toEqual([
			{
				id: 4,
				name: "Proveedor real",
				reason: "no es Quintal ni un proveedor de prisma/seed.ts",
			},
		]);
		expect(plan.unclassified.products[0]?.reason).toBe(
			'su proveedor por defecto "Proveedor real" (id 4) no es Quintal ni demo',
		);
	});

	it("keeps a demo-supplied product that another supplier also sells, and pins that supplier", () => {
		const real = supplier(4, "Proveedor real");
		const plan = planDemoPurge(
			identity,
			state({
				suppliers: [quintal, valleVerde, real],
				products: [
					product(20, "Tomate perita fresco", {
						defaultSupplierId: valleVerde.id,
					}),
				],
				supplierTerms: [
					{ id: 2000, productId: 20, supplierId: valleVerde.id },
					{ id: 2001, productId: 20, supplierId: real.id },
				],
			}),
		);

		expect(plan.demo.products).toEqual([]);
		expect(plan.unclassified.products).toEqual([
			{
				id: 20,
				name: "Tomate perita fresco",
				reason:
					'tiene términos de un proveedor que no es demo: "Proveedor real" (id 4)',
			},
		]);
		expect(plan.demo.suppliers).toEqual([]);
		expect(plan.demo.supplierTermIds).toEqual([]);
	});

	it("keeps a demo brand that a kept product also uses", () => {
		const plan = planDemoPurge(
			identity,
			state({
				products: [
					product(10, "Almendra guara", { brandId: 100 }),
					product(20, "Tomate perita fresco", {
						defaultSupplierId: valleVerde.id,
						brandId: 100,
					}),
				],
			}),
		);

		expect(plan.demo.brands).toEqual([]);
		expect(plan.sharedBrands).toEqual([
			{ id: 100, name: "Andes Fresh", keptProductIds: [10] },
		]);
	});

	it("never touches a brand no demo product uses", () => {
		const plan = planDemoPurge(
			identity,
			state({
				brands: [
					{ id: 100, name: "Andes Fresh" },
					{ id: 101, name: "Pampa Pack" },
					{ id: 102, name: "Marca sin productos" },
				],
			}),
		);

		expect(plan.demo.brands.map((b) => b.id)).toEqual([100, 101]);
	});

	it("clears the home spotlight only when it points at a demo product", () => {
		expect(
			planDemoPurge(identity, state({ spotlightProductId: 20 })).demo
				.clearSpotlight,
		).toBe(true);
		expect(
			planDemoPurge(identity, state({ spotlightProductId: 10 })).demo
				.clearSpotlight,
		).toBe(false);
		expect(planDemoPurge(identity, state()).demo.clearSpotlight).toBe(false);
	});

	it("blocks when there is no Quintal supplier", () => {
		const plan = planDemoPurge(
			identity,
			state({ suppliers: [valleVerde, packNorte] }),
		);

		expect(plan.blockers).toHaveLength(1);
		expect(plan.blockers[0]).toContain('"Quintal"');
	});

	it("treats a deleted Quintal as Quintal", () => {
		const plan = planDemoPurge(
			identity,
			state({
				suppliers: [{ ...quintal, deleted: true }, valleVerde, packNorte],
			}),
		);

		expect(plan.blockers).toEqual([]);
		expect(plan.quintal.productIds).toEqual([10]);
	});
});

describe("parsePurgeArgs", () => {
	it("is a dry run without flags", () => {
		expect(parsePurgeArgs([])).toEqual({
			apply: false,
			confirmProduction: false,
		});
	});

	it("reads --apply and --confirm-production", () => {
		expect(parsePurgeArgs(["--apply", "--confirm-production"])).toEqual({
			apply: true,
			confirmProduction: true,
		});
	});

	it("rejects an unknown flag instead of silently running a dry run", () => {
		expect(() => parsePurgeArgs(["--aply"])).toThrow("--aply");
	});
});

describe("assertApplyAllowed", () => {
	it("allows a dry run and an apply outside production", () => {
		expect(() =>
			assertApplyAllowed("production", parsePurgeArgs([])),
		).not.toThrow();
		expect(() =>
			assertApplyAllowed("development", parsePurgeArgs(["--apply"])),
		).not.toThrow();
	});

	it("asks for --confirm-production to apply on production", () => {
		expect(() =>
			assertApplyAllowed("production", parsePurgeArgs(["--apply"])),
		).toThrow("--confirm-production");
		expect(() =>
			assertApplyAllowed(
				"production",
				parsePurgeArgs(["--apply", "--confirm-production"]),
			),
		).not.toThrow();
	});
});

function read(relative: string) {
	return readFileSync(new URL(relative, import.meta.url), "utf8");
}

type SchemaModel = { name: string; parents: string[] };

function schemaModels(): SchemaModel[] {
	const schema = read("../prisma/schema.prisma");
	return Array.from(schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm), (m) => ({
		name: m[1] ?? "",
		parents: Array.from(
			(m[2] ?? "").matchAll(/^\s*\w+\s+(\w+)\??\s+@relation\([^)]*fields:/gm),
			(relation) => relation[1] ?? "",
		),
	}));
}

describe("schema coverage", () => {
	const deleteOrder: string[] = [
		...TRANSACTIONAL_DELETE_ORDER,
		...CATALOG_DELETE_ORDER,
	];

	it("classifies every model exactly once", () => {
		const classified = [...deleteOrder, ...KEPT_MODELS];

		expect(new Set(classified).size).toBe(classified.length);
		expect([...classified].sort()).toEqual(
			schemaModels()
				.map((model) => model.name)
				.sort(),
		);
	});

	it("deletes every child before the parent its foreign key points at", () => {
		for (const model of schemaModels()) {
			const childIndex = deleteOrder.indexOf(model.name);
			if (childIndex === -1) continue;
			for (const parent of model.parents) {
				const parentIndex = deleteOrder.indexOf(parent);
				if (parentIndex === -1 || parent === model.name) continue;
				expect(
					childIndex,
					`${model.name} must be deleted before ${parent}`,
				).toBeLessThan(parentIndex);
			}
		}
	});

	it("keeps no row that points at a deleted one, except the spotlight it clears", () => {
		const kept = new Set<string>(KEPT_MODELS);
		const pointers = schemaModels().flatMap((model) =>
			kept.has(model.name)
				? model.parents
						.filter((parent) => deleteOrder.includes(parent))
						.map((parent) => `${model.name}->${parent}`)
				: [],
		);

		expect(pointers).toEqual(["HomeOfferSettings->Product"]);
	});

	it("names only suppliers prisma/seed.ts creates", () => {
		const seed = read("../prisma/seed.ts");
		for (const name of DEMO_SUPPLIER_NAMES) {
			expect(seed).toContain(`name: "${name}"`);
		}
	});

	it("never deletes from a kept model", () => {
		const source = read("./purge-demo-data.ts");
		for (const model of KEPT_MODELS) {
			const delegate = model.charAt(0).toLowerCase() + model.slice(1);
			expect(source).not.toMatch(
				new RegExp(`\\.${delegate}\\.delete(Many)?\\(`),
			);
		}
	});
});
