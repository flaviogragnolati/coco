/**
 * `pnpm db:seed:init`: loads Quintal, its products and their supplier and client
 * terms from `scripts/quintal-catalog.data.ts`. Each new product goes into the
 * category `resolveQuintalCategory` gives it; the categories must already exist.
 *
 * Safe for production: it only ever inserts. What already exists is kept as is,
 * whatever an admin changed in it, so a rerun over a loaded database creates
 * nothing. The decisions live in `seed-init.plan.ts`.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "~/prisma/client";
import {
	applySeedInitPlan as applyPlan,
	type Catalog,
	loadSeedInitState as loadState,
	toSeedInitCatalog,
} from "./lib/seed-init-core";
import { quintalCatalog } from "./quintal-catalog.data";
import { quintalCatalogSchema } from "./quintal-catalog.schema";
import { planSeedInit, type SeedInitPlan } from "./seed-init.plan";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is required to run scripts/seed-init.ts");
}

const db = new PrismaClient({
	adapter: new PrismaPg({ connectionString: DATABASE_URL }),
	log: ["error", "warn"],
});

function printSummary(
	plan: SeedInitPlan,
	result: Awaited<ReturnType<typeof applyPlan>>,
	catalog: Catalog,
) {
	const kept = plan.products.filter((decision) => decision.action === "keep");
	const skipped: string[] = [];
	for (const decision of plan.products) {
		if (decision.action === "skip") {
			skipped.push(`${decision.name}: ${decision.reason}`);
		} else if (decision.action === "keep") {
			for (const terms of [decision.supplierTerms, decision.clientTerms]) {
				if (terms.action === "skip")
					skipped.push(`${decision.name}: ${terms.reason}`);
			}
		}
	}

	console.info(
		`Catálogo ${catalog.supplier.name}: lista del ${catalog.source.listDate.slice(0, 10)}, ${catalog.products.length} productos.`,
	);
	console.info(
		plan.supplier.action === "create"
			? `Proveedor creado (id ${result.supplierId}).`
			: `Proveedor existente (id ${result.supplierId}), sin cambios.`,
	);
	console.info(
		`Productos: ${result.productsCreated} creados, ${kept.length} existentes sin cambios, ${plan.products.length - result.productsCreated - kept.length} omitidos.`,
	);
	console.info(
		`Términos creados: ${result.supplierTermsCreated} de proveedor, ${result.clientTermsCreated} de cliente.`,
	);
	if (skipped.length > 0) {
		console.info("Omitidos:");
		for (const line of skipped) console.info(`  - ${line}`);
	}
	if (plan.warnings.length > 0) {
		console.warn("Avisos:");
		for (const line of plan.warnings) console.warn(`  - ${line}`);
	}
}

async function main() {
	const catalog = quintalCatalogSchema.parse(quintalCatalog);
	const listDate = new Date(catalog.source.listDate);
	const input = toSeedInitCatalog(catalog);

	const { plan, result } = await db.$transaction(
		async (tx) => {
			const state = await loadState(tx, catalog);
			const plan = planSeedInit(input, state, new Date());
			const result = await applyPlan(tx, plan, catalog, listDate);
			return { plan, result };
		},
		{ maxWait: 30_000, timeout: 180_000 },
	);

	printSummary(plan, result, catalog);
}

main()
	.catch((error) => {
		console.error("db:seed:init falló; no se escribió nada.");
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
