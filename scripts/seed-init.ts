/**
 * `pnpm db:seed:init`: loads Quintal, its products and their supplier and client
 * terms from `scripts/quintal-catalog.data.ts`.
 *
 * Safe for production: it only ever inserts. What already exists is kept as is,
 * whatever an admin changed in it, so a rerun over a loaded database creates
 * nothing. The decisions live in `seed-init.plan.ts`; this file loads the state,
 * applies the creates in one transaction and prints what it did and skipped.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "~/prisma/client";
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

type Catalog = ReturnType<typeof quintalCatalogSchema.parse>;
type CatalogProduct = Catalog["products"][number];

const flags = { active: true, deleted: true } as const;

async function loadState(tx: Prisma.TransactionClient, catalog: Catalog) {
	const suppliers = await tx.supplier.findMany({
		where: { name: catalog.supplier.name },
		select: { id: true, name: true, ...flags },
	});
	const products = await tx.product.findMany({
		where: {
			OR: [
				{ name: { in: catalog.products.map((product) => product.name) } },
				{ defaultSupplierId: { in: suppliers.map((supplier) => supplier.id) } },
			],
		},
		select: { id: true, name: true, defaultSupplierId: true, ...flags },
	});
	const productIds = products.map((product) => product.id);
	const window = { productId: true, fromDate: true, toDate: true, ...flags };
	const supplierTerms = await tx.productSupplierTerms.findMany({
		where: {
			productId: { in: productIds },
			supplierId: { in: suppliers.map((supplier) => supplier.id) },
		},
		select: { ...window, supplierId: true },
	});
	const clientTerms = await tx.productClientTerms.findMany({
		where: { productId: { in: productIds } },
		select: window,
	});
	return { suppliers, products, supplierTerms, clientTerms };
}

async function applyPlan(
	tx: Prisma.TransactionClient,
	plan: SeedInitPlan,
	catalog: Catalog,
	listDate: Date,
) {
	const byKey = new Map(
		catalog.products.map((product) => [product.key, product]),
	);
	const productOf = (key: string) => {
		const product = byKey.get(key);
		if (!product) throw new Error(`Producto ${key} fuera del catálogo`);
		return product;
	};

	const supplierId =
		plan.supplier.action === "keep"
			? plan.supplier.id
			: (
					await tx.supplier.create({
						data: {
							name: catalog.supplier.name,
							description: catalog.supplier.description,
							active: true,
							address: catalog.supplier.address,
							contactInfo: catalog.supplier.contactInfo,
						},
						select: { id: true },
					})
				).id;

	const toCreate = plan.products.flatMap((decision) =>
		decision.action === "create" ? [productOf(decision.key)] : [],
	);
	const created = toCreate.length
		? await tx.product.createManyAndReturn({
				data: toCreate.map((product) => ({
					name: product.name,
					description: product.description,
					unit: product.unit,
					active: true,
					brandId: null,
					defaultSupplierId: supplierId,
				})),
				select: { id: true, name: true },
			})
		: [];
	const createdIds = new Map(
		created.map((product) => [product.name, product.id]),
	);

	const supplierTermsFor: Array<[number, CatalogProduct]> = [];
	const clientTermsFor: Array<[number, CatalogProduct]> = [];
	for (const decision of plan.products) {
		if (decision.action === "create") {
			const productId = createdIds.get(decision.name);
			if (productId === undefined) {
				throw new Error(`No volvió el id de "${decision.name}"`);
			}
			supplierTermsFor.push([productId, productOf(decision.key)]);
			clientTermsFor.push([productId, productOf(decision.key)]);
		} else if (decision.action === "keep") {
			if (decision.supplierTerms.action === "create") {
				supplierTermsFor.push([decision.productId, productOf(decision.key)]);
			}
			if (decision.clientTerms.action === "create") {
				clientTermsFor.push([decision.productId, productOf(decision.key)]);
			}
		}
	}

	if (supplierTermsFor.length > 0) {
		await tx.productSupplierTerms.createMany({
			data: supplierTermsFor.map(([productId, { supplierTerms }]) => ({
				productId,
				supplierId,
				moq: supplierTerms.moq,
				moqPrice: supplierTerms.moqPrice,
				step: supplierTerms.step,
				stepPrice: supplierTerms.stepPrice,
				max: null,
				refPrice: supplierTerms.refPrice,
				currency: catalog.source.currency,
				active: true,
				fromDate: listDate,
				toDate: null,
			})),
		});
	}
	if (clientTermsFor.length > 0) {
		await tx.productClientTerms.createMany({
			data: clientTermsFor.map(([productId, { clientTerms }]) => ({
				productId,
				moq: clientTerms.moq,
				moqPrice: clientTerms.moqPrice,
				step: clientTerms.step,
				stepPrice: clientTerms.stepPrice,
				max: clientTerms.max,
				unitPrice: clientTerms.unitPrice,
				marketPrice: null,
				discountPercent: null,
				currency: catalog.source.currency,
				active: true,
				fromDate: listDate,
				toDate: null,
			})),
		});
	}

	return {
		supplierId,
		productsCreated: created.length,
		supplierTermsCreated: supplierTermsFor.length,
		clientTermsCreated: clientTermsFor.length,
	};
}

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

	const { plan, result } = await db.$transaction(
		async (tx) => {
			const state = await loadState(tx, catalog);
			const plan = planSeedInit(
				{
					supplierName: catalog.supplier.name,
					listDate,
					products: catalog.products,
				},
				state,
				new Date(),
			);
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
