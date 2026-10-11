/**
 * `pnpm db:migrate-unit-pricing [--apply]`: moves the shared database to the
 * unit-price model.
 *
 * - Live client terms of Quintal's per-kg products: minimum and step 0,5, their
 *   prices derived from the unit price. Other live terms with a unit price get
 *   their minimum and step prices recomputed from it. Terms are edited in
 *   place, never closed, so open carts and checkouts keep working.
 * - Quintal products sold by the unit: presentation inferred from the name.
 * - "Presentación del proveedor: …" leaves the product description for the
 *   live Quintal supplier terms.
 *
 * Dry run by default: prints the plan and writes nothing. `--apply` re-reads
 * and applies it in one transaction. Rerunning plans nothing. The decisions
 * live in `migrate-unit-pricing.plan.ts`.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "~/prisma/client";
import { resolveScriptAppEnv } from "./lib/seed-environment";
import {
	describePlan,
	isEmptyPlan,
	planUnitPricing,
	type UnitPricingPlan,
	type UnitPricingState,
} from "./migrate-unit-pricing.plan";
import { QUINTAL_SUPPLIER_NAME } from "./quintal-catalog.schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error(
		"DATABASE_URL is required to run scripts/migrate-unit-pricing.ts",
	);
}

const args = process.argv.slice(2);
const unknownArgs = args.filter((arg) => arg !== "--apply");
if (unknownArgs.length > 0) {
	throw new Error(
		`Argumentos desconocidos: ${unknownArgs.join(" ")}. Uso: pnpm db:migrate-unit-pricing [--apply]`,
	);
}
const apply = args.includes("--apply");

const db = new PrismaClient({
	adapter: new PrismaPg({ connectionString: DATABASE_URL }),
	log: ["error", "warn"],
});

type Db = Prisma.TransactionClient;

async function loadState(tx: Db): Promise<UnitPricingState> {
	const quintal = await tx.supplier.findFirst({
		where: { name: QUINTAL_SUPPLIER_NAME, deleted: false },
		orderBy: { id: "asc" },
		select: { id: true },
	});
	// Sequential: queries inside a transaction share one connection.
	const products = await tx.product.findMany({
		where: { deleted: false },
		select: {
			id: true,
			name: true,
			unit: true,
			description: true,
			defaultSupplierId: true,
			deleted: true,
			presentationContainer: true,
			presentationSize: true,
		},
		orderBy: { id: "asc" },
	});
	const clientTerms = await tx.productClientTerms.findMany({
		where: { active: true, deleted: false },
		select: {
			id: true,
			productId: true,
			moq: true,
			moqPrice: true,
			step: true,
			stepPrice: true,
			unitPrice: true,
			active: true,
			deleted: true,
			toDate: true,
		},
		orderBy: { id: "asc" },
	});
	const supplierTerms = await tx.productSupplierTerms.findMany({
		where: { active: true, deleted: false },
		select: {
			id: true,
			productId: true,
			supplierId: true,
			supplierPresentation: true,
			active: true,
			deleted: true,
			toDate: true,
		},
		orderBy: { id: "asc" },
	});

	const text = (value: { toString(): string } | null) =>
		value === null ? null : value.toString();
	return {
		quintalSupplierId: quintal?.id ?? null,
		products,
		clientTerms: clientTerms.map((terms) => ({
			...terms,
			moq: terms.moq.toString(),
			moqPrice: terms.moqPrice.toString(),
			step: text(terms.step),
			stepPrice: text(terms.stepPrice),
			unitPrice: text(terms.unitPrice),
		})),
		supplierTerms,
	};
}

async function applyPlan(tx: Db, plan: UnitPricingPlan) {
	for (const change of plan.clientTerms) {
		await tx.productClientTerms.update({
			where: { id: change.id },
			data: change.after,
		});
	}
	for (const change of plan.presentations) {
		await tx.product.update({
			where: { id: change.productId },
			data: {
				presentationContainer: change.presentationContainer,
				presentationSize: change.presentationSize,
			},
		});
	}
	for (const change of plan.descriptions) {
		if (change.supplierTermsIds.length > 0) {
			await tx.productSupplierTerms.updateMany({
				where: { id: { in: change.supplierTermsIds } },
				data: { supplierPresentation: change.supplierPresentation },
			});
		}
		await tx.product.update({
			where: { id: change.productId },
			data: { description: change.after },
		});
	}
}

async function main() {
	const host = new URL(DATABASE_URL ?? "").host;
	console.info(
		`Base ${host} (APP_ENV=${resolveScriptAppEnv(process.env)}). ${apply ? "Aplicando." : "Simulación: no se escribe nada; --apply para aplicar."}`,
	);

	if (!apply) {
		const plan = planUnitPricing(await loadState(db), new Date());
		for (const line of describePlan(plan)) console.info(line);
		return;
	}

	const plan = await db.$transaction(
		async (tx) => {
			const plan = planUnitPricing(await loadState(tx), new Date());
			await applyPlan(tx, plan);
			return plan;
		},
		{ maxWait: 30_000, timeout: 180_000 },
	);
	for (const line of describePlan(plan)) console.info(line);
	console.info(
		isEmptyPlan(plan)
			? "Nada que aplicar: la base ya estaba migrada."
			: "Aplicado.",
	);
}

main()
	.catch((error) => {
		console.error("db:migrate-unit-pricing falló; no se escribió nada.");
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
