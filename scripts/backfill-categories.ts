/**
 * `pnpm db:backfill:categories [--apply] [--force]`: puts every Quintal product
 * in its catalog category (`quintalCategoryOverrides`).
 *
 * Dry run by default: prints the proposal and writes nothing. `--apply` writes it
 * in one transaction. Only products without a category are touched unless
 * `--force`. Products it cannot classify (demo data, renamed products) are listed
 * and left as they are. The decisions live in `backfill-categories.plan.ts`.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "~/prisma/client";
import {
	type BackfillPlan,
	planCategoryBackfill,
} from "./backfill-categories.plan";
import { resolveScriptAppEnv } from "./lib/seed-environment";
import { resolveQuintalCategory } from "./quintal-catalog.categories";
import { quintalCatalog } from "./quintal-catalog.data";
import { QUINTAL_SUPPLIER_NAME } from "./quintal-catalog.schema";

const SCRIPT = "db:backfill:categories";
const FLAGS = ["--apply", "--force"] as const;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error(`DATABASE_URL is required to run ${SCRIPT}`);
}

const db = new PrismaClient({
	adapter: new PrismaPg({ connectionString: DATABASE_URL }),
	log: ["error", "warn"],
});

function parseArgs(argv: string[]) {
	const unknown = argv.filter(
		(arg) => !(FLAGS as readonly string[]).includes(arg),
	);
	if (unknown.length > 0) {
		throw new Error(
			`Argumentos desconocidos: ${unknown.join(" ")}. Uso: pnpm ${SCRIPT} [--apply] [--force]`,
		);
	}
	return { apply: argv.includes("--apply"), force: argv.includes("--force") };
}

async function loadInput(tx: Prisma.TransactionClient, force: boolean) {
	const [products, categories, suppliers] = await Promise.all([
		tx.product.findMany({
			select: {
				id: true,
				name: true,
				categoryId: true,
				defaultSupplierId: true,
			},
			orderBy: { id: "asc" },
		}),
		tx.category.findMany({ select: { id: true, name: true, deleted: true } }),
		tx.supplier.findMany({
			where: { name: QUINTAL_SUPPLIER_NAME },
			select: { id: true },
		}),
	]);

	return {
		products,
		categories,
		quintalSupplierIds: suppliers.map((supplier) => supplier.id),
		catalog: quintalCatalog.products.map((product) => ({
			key: product.key,
			name: product.name,
			heading: product.category,
			categoryName: resolveQuintalCategory(product),
		})),
		force,
	};
}

async function applyPlan(
	tx: Prisma.TransactionClient,
	plan: BackfillPlan,
	force: boolean,
) {
	let updated = 0;
	for (const [categoryId, productIds] of plan.assignments) {
		const result = await tx.product.updateMany({
			where: {
				id: { in: productIds },
				...(force ? {} : { categoryId: null }),
			},
			data: { categoryId },
		});
		if (result.count !== productIds.length) {
			throw new Error(
				`Se esperaban ${productIds.length} productos para la categoría ${categoryId} y se actualizaron ${result.count}: alguien los cambió durante el backfill.`,
			);
		}
		updated += result.count;
	}
	return updated;
}

function printPlan(plan: BackfillPlan) {
	const assigned = plan.decisions.flatMap((decision) =>
		decision.action === "assign" ? [decision] : [],
	);
	const kept = plan.decisions.flatMap((decision) =>
		decision.action === "keep" ? [decision] : [],
	);
	const unclassified = plan.decisions.flatMap((decision) =>
		decision.action === "unclassified" ? [decision] : [],
	);

	console.info(`Productos: ${plan.decisions.length}.`);
	if (assigned.length > 0) {
		console.info("Asignaciones propuestas:");
		for (const decision of assigned) {
			const change =
				decision.previousCategoryId === null
					? ""
					: ` (antes categoría ${decision.previousCategoryId})`;
			console.info(
				`  - [${decision.productId}] ${decision.name} → ${decision.categoryName}${change}`,
			);
		}
	}
	console.info("Por categoría:");
	for (const { name, count } of plan.assignedPerCategory) {
		console.info(`  - ${name}: ${count}`);
	}
	console.info(`Sin cambios: ${kept.length}.`);
	for (const decision of kept) {
		console.info(
			`  - [${decision.productId}] ${decision.name}: ${decision.reason}`,
		);
	}
	console.info(`Sin clasificar: ${unclassified.length}.`);
	for (const decision of unclassified) {
		console.info(
			`  - [${decision.productId}] ${decision.name}: ${decision.reason}`,
		);
	}
	console.info(
		`Quedarían sin categoría: ${plan.leftWithoutCategory}. Con 0 se puede pasar product.categoryId a NOT NULL.`,
	);
}

async function main() {
	const { apply, force } = parseArgs(process.argv.slice(2));
	console.info(
		`${SCRIPT} (APP_ENV=${resolveScriptAppEnv(process.env)}): ${apply ? "aplicando" : "simulación, no escribe nada"}${force ? ", con --force" : ""}.`,
	);

	const { plan, updated } = await db.$transaction(
		async (tx) => {
			const plan = planCategoryBackfill(await loadInput(tx, force));
			const updated = apply ? await applyPlan(tx, plan, force) : 0;
			return { plan, updated };
		},
		{ maxWait: 30_000, timeout: 120_000 },
	);

	printPlan(plan);
	console.info(
		apply
			? `Listo: ${updated} productos actualizados.`
			: "Simulación: no se escribió nada. Repetí con --apply para guardar.",
	);
}

main()
	.catch((error) => {
		console.error(`${SCRIPT} falló; no se escribió nada.`);
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
