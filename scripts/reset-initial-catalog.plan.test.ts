import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATALOG_CATEGORY_NAMES } from "./lib/catalog-categories";
import { modelTables } from "./lib/reset-initial-catalog";
import type { Catalog } from "./lib/seed-init-core";
import { quintalCatalog } from "./quintal-catalog.data";
import { quintalCatalogSchema } from "./quintal-catalog.schema";
import {
	assertResetApplyAllowed,
	describeDatabaseTarget,
	parseResetArgs,
	planInitialCatalogReset,
	RESET_DELETE_ORDER,
	RESET_PRESERVED_MODELS,
} from "./reset-initial-catalog.plan";

const catalog = quintalCatalogSchema.parse(quintalCatalog);
const now = new Date("2026-10-17T00:00:00Z");
function state() {
	return {
		suppliers: [{ id: 1, name: "Quintal", active: true, deleted: false }],
		products: [],
		supplierTerms: [],
		clientTerms: [],
		categories: CATALOG_CATEGORY_NAMES.map((name, i) => ({
			id: i + 1,
			name,
			active: true,
			deleted: false,
		})),
	};
}

describe("initial catalog reset guards", () => {
	it("covers every declared model exactly once, including preserved ledger and home", () => {
		const schema = readFileSync(
			new URL("../prisma/schema.prisma", import.meta.url),
			"utf8",
		);
		for (const [name, table] of modelTables) {
			const body = schema.match(
				new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`),
			)?.[1];
			expect(body).toContain(`@@map("${table}")`);
		}
		expect(
			new Set([
				...RESET_DELETE_ORDER,
				...RESET_PRESERVED_MODELS,
				"HomeOfferSettings",
				"PaymentProviderEvent",
			]),
		).toEqual(new Set(modelTables.keys()));
		expect(RESET_DELETE_ORDER).not.toContain("PaymentProviderEvent");
	});
	it("accepts the agreed snapshot and active reference data", () => {
		expect(
			planInitialCatalogReset(catalog, state(), 0, 0, now).blockers,
		).toEqual([]);
	});
	it.each([
		"outbox",
		"payments",
		"future",
		"category",
		"supplier",
		"duplicate",
		"snapshot",
	])("blocks %s before deletion", (reason) => {
		const current = state();
		const input: Catalog = structuredClone(catalog);
		const firstCategory = current.categories[0],
			firstSupplier = current.suppliers[0];
		if (!firstCategory || !firstSupplier) throw new Error("Incomplete fixture");
		if (reason === "category") firstCategory.active = false;
		if (reason === "supplier") firstSupplier.deleted = true;
		if (reason === "duplicate")
			current.suppliers.push({ ...firstSupplier, id: 2 });
		if (reason === "future") input.source.listDate = "2099-01-01T00:00:00Z";
		if (reason === "snapshot") input.products.pop();
		expect(
			planInitialCatalogReset(
				input,
				current,
				reason === "outbox" ? 1 : 0,
				reason === "payments" ? 1 : 0,
				now,
			).blockers.length,
		).toBeGreaterThan(0);
	});
	it("requires explicit destination, production flag and backup for apply", () => {
		const target = describeDatabaseTarget(
			"postgresql://secret:password@localhost:55437/coco_reset_test",
		);
		expect(target).toBe("localhost:55437/coco_reset_test");
		expect(parseResetArgs([])).toEqual({
			apply: false,
			confirmProduction: false,
		});
		expect(() =>
			assertResetApplyAllowed(
				{ apply: true, confirmProduction: true, backup: "backup.dump" },
				target,
				"production",
			),
		).toThrow(/target/);
		expect(() =>
			assertResetApplyAllowed(
				{ apply: true, target, confirmProduction: true },
				target,
				"production",
			),
		).toThrow(/backup/);
		expect(() =>
			assertResetApplyAllowed(
				{
					apply: true,
					target,
					backup: "backup.dump",
					confirmProduction: false,
				},
				target,
				"production",
			),
		).toThrow(/production/);
		expect(() =>
			assertResetApplyAllowed(
				parseResetArgs([
					"--apply",
					"--target",
					target,
					"--backup",
					"backup.dump",
					"--confirm-production",
				]),
				target,
				"production",
			),
		).not.toThrow();
		expect(() => parseResetArgs(["--force"])).toThrow();
		expect(() => parseResetArgs(["--target", "--apply"])).toThrow();
	});
	it.each([
		"postgresql://u:p@localhost/catalog_test?host=shared.example&port=5439",
		"postgresql://u:p@localhost/catalog_test?port=5439",
		"postgresql://u:p@localhost/catalog_test?options=-c%20search_path=elsewhere",
		"postgresql://u:p@localhost",
		"postgresql://u:p@localhost/",
		"postgresql://u:p@%2ftmp/catalog_test",
	])("rejects ambiguous or overridden routing: %s", (url) => {
		expect(() => describeDatabaseTarget(url)).toThrow();
	});
});
