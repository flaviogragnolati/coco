import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { Prisma, type PrismaClient } from "~/prisma/client";
import { isTermsWindowCurrent } from "~/server/services/_base/terms-validity";
import { quintalCatalogSchema } from "../quintal-catalog.schema";
import {
	InitialCatalogResetError,
	planInitialCatalogReset,
	RESET_DELETE_ORDER,
	RESET_PRESERVED_MODELS,
} from "../reset-initial-catalog.plan";
import { planSeedInit } from "../seed-init.plan";
import {
	applySeedInitPlan,
	type Catalog,
	loadSeedInitState,
	toSeedInitCatalog,
} from "./seed-init-core";

type Tx = Prisma.TransactionClient;
export const modelTables = new Map<string, string>(
	Object.values(Prisma.ModelName).map((name) => [
		name,
		name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase(),
	]),
);
function table(model: string) {
	const name = modelTables.get(model);
	if (!name || !/^[a-z_]+$/.test(name))
		throw new InitialCatalogResetError(`Tabla desconocida: ${model}`);
	return Prisma.raw(`"public"."${name}"`);
}

export function backupDigest(path: string) {
	const stat = statSync(path);
	if (!stat.isFile() || stat.size < 100 || (stat.mode & 0o077) !== 0)
		throw new InitialCatalogResetError(
			"El backup debe ser un archivo no vacío y privado (chmod 600)",
		);
	const bytes = readFileSync(path);
	if (bytes.subarray(0, 5).toString() !== "PGDMP")
		throw new InitialCatalogResetError(
			"Se requiere backup PostgreSQL custom (pg_dump -Fc), con restauración ensayada",
		);
	return createHash("sha256").update(bytes).digest("hex");
}

async function digestTable(tx: Tx, model: string) {
	const rows = await tx.$queryRaw<Array<{ digest: string }>>(
		Prisma.sql`SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text, '[]')) AS digest FROM ${table(model)} t`,
	);
	return rows[0]?.digest;
}

async function preservedDigests(tx: Tx) {
	const result: Record<string, string | undefined> = {};
	for (const model of RESET_PRESERVED_MODELS)
		result[model] = await digestTable(tx, model);
	const ledger = await tx.$queryRaw<
		Array<{ digest: string }>
	>`SELECT md5(coalesce(jsonb_agg(to_jsonb(t) - 'userTransactionId' ORDER BY t.id)::text, '[]')) AS digest FROM payment_provider_event t`;
	result.PaymentProviderEvent = ledger[0]?.digest;
	return result;
}

export async function inventoryInitialCatalogReset(
	tx: Tx,
	catalog: Catalog,
	now = new Date(),
) {
	const state = await loadSeedInitState(tx, catalog);
	const categories = await tx.category.findMany({
		select: { id: true, name: true, deleted: true, active: true },
	});
	const unsettledOutbox = await tx.domainEventOutbox.count({
		where: { status: { in: ["pending", "processing", "failed"] } },
	});
	const unsettledPayments =
		(await tx.userTransaction.count({
			where: { status: { in: ["pending", "inProcess"] } },
		})) +
		(await tx.paymentProviderEvent.count({
			where: { status: { in: ["received", "failed"] } },
		}));
	const plan = planInitialCatalogReset(
		catalog,
		{ ...state, categories },
		unsettledOutbox,
		unsettledPayments,
		now,
	);
	const deleting: Record<string, number> = {};
	for (const model of RESET_DELETE_ORDER) {
		const rows = await tx.$queryRaw<Array<{ count: number }>>(
			Prisma.sql`SELECT count(*)::int AS count FROM ${table(model)}`,
		);
		deleting[model] = rows[0]?.count ?? 0;
	}
	const version = await tx.$queryRaw<
		Array<{ server_version: string }>
	>`SHOW server_version`;
	return {
		targetVersion: version[0]?.server_version,
		plan,
		deleting,
		unsettledOutbox,
		unsettledPayments,
	};
}

function assertEqual(actual: unknown, expected: unknown, label: string) {
	if (JSON.stringify(actual) !== JSON.stringify(expected))
		throw new InitialCatalogResetError(`Verificación falló: ${label}`);
}

export async function verifyInitialCatalog(
	tx: Tx,
	catalog: Catalog,
	now = new Date(),
) {
	const products = await tx.product.findMany({
		include: {
			category: true,
			productSupplierTerms: true,
			productClientTerms: true,
		},
	});
	assertEqual(
		products.length,
		catalog.products.length,
		"cantidad de productos",
	);
	assertEqual(
		await tx.productClientTerms.count(),
		catalog.products.length,
		"cantidad términos cliente",
	);
	assertEqual(
		await tx.productSupplierTerms.count(),
		catalog.products.length,
		"cantidad términos proveedor",
	);
	assertEqual(
		await tx.productLocalConstraints.count(),
		0,
		"restricciones anteriores",
	);
	const supplier = await tx.supplier.findFirstOrThrow({
		where: { name: catalog.supplier.name, deleted: false, active: true },
	});
	for (const expected of catalog.products) {
		const actual = products.find((p) => p.name === expected.name);
		if (!actual)
			throw new InitialCatalogResetError(`Falta producto: ${expected.name}`);
		assertEqual(
			[
				actual.unit,
				actual.description,
				actual.active,
				actual.deleted,
				actual.defaultSupplierId,
				actual.category?.name,
				actual.presentationContainer,
				actual.presentationSize,
				actual.brandId,
			],
			[
				expected.unit,
				expected.description,
				true,
				false,
				supplier.id,
				expected.category,
				expected.presentation?.presentationContainer ?? null,
				expected.presentation?.presentationSize ?? null,
				null,
			],
			expected.name,
		);
		const client = actual.productClientTerms[0],
			terms = actual.productSupplierTerms[0];
		if (
			actual.productClientTerms.length !== 1 ||
			actual.productSupplierTerms.length !== 1 ||
			!client ||
			!terms
		)
			throw new InitialCatalogResetError(
				`Términos duplicados/ausentes: ${expected.name}`,
			);
		for (const [record, reference] of [
			[client, expected.clientTerms],
			[terms, expected.supplierTerms],
		] as const) {
			if (!isTermsWindowCurrent(record, now))
				throw new InitialCatalogResetError(
					`Vigencia inválida: ${expected.name}`,
				);
			for (const field of ["moq", "step", "moqPrice", "stepPrice"] as const)
				if (!record[field]?.equals(reference[field]))
					throw new InitialCatalogResetError(
						`Término ${field} inválido: ${expected.name}`,
					);
			assertEqual(
				[
					record.currency,
					record.max,
					record.fromDate.toISOString(),
					record.toDate,
				],
				["ARS", null, catalog.source.listDate, null],
				`vigencia/moneda ${expected.name}`,
			);
		}
		if (
			!client.unitPrice?.equals(expected.clientTerms.unitPrice) ||
			client.marketPrice !== null ||
			client.discountPercent !== null ||
			terms.supplierId !== supplier.id ||
			!terms.refPrice?.equals(expected.supplierTerms.refPrice) ||
			terms.supplierPresentation !== expected.supplierTerms.supplierPresentation
		)
			throw new InitialCatalogResetError(
				`Precio/presentación inválido: ${expected.name}`,
			);
	}
}

export async function replaceInitialCatalog(tx: Tx, input: Catalog) {
	const catalog = quintalCatalogSchema.parse(input);
	// Lock readers and writers together: no committed empty catalog, no concurrent
	// outbox, webhook or admin write between inventory and verification.
	await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
	const tables = [...modelTables.keys()].sort().map((model) => table(model));
	await tx.$executeRaw(
		Prisma.sql`LOCK TABLE ${Prisma.join(tables)} IN ACCESS EXCLUSIVE MODE`,
	);
	const inventory = await inventoryInitialCatalogReset(tx, catalog);
	if (inventory.plan.blockers.length)
		throw new InitialCatalogResetError(inventory.plan.blockers.join("; "));
	const preserved = await preservedDigests(tx);
	const home = await tx.homeOfferSettings.findMany();
	const oldProducts = await tx.product.findMany({
		select: { id: true, name: true, homeOfferRank: true },
	});
	for (const model of RESET_DELETE_ORDER)
		await tx.$executeRaw(Prisma.sql`DELETE FROM ${table(model)}`);
	const state = await loadSeedInitState(tx, catalog);
	const plan = planSeedInit(toSeedInitCatalog(catalog), state, new Date());
	if (
		plan.products.some((p) => p.action !== "create") ||
		plan.products.length !== 27
	)
		throw new InitialCatalogResetError(
			"El reemplazo no crearía exactamente 27 productos",
		);
	const result = await applySeedInitPlan(
		tx,
		plan,
		catalog,
		new Date(catalog.source.listDate),
	);
	const created = await tx.product.findMany({
		select: { id: true, name: true },
	});
	for (const old of oldProducts) {
		const product = created.find((p) => p.name === old.name);
		if (product && old.homeOfferRank !== null)
			await tx.product.update({
				where: { id: product.id },
				data: { homeOfferRank: old.homeOfferRank },
			});
	}
	for (const setting of home) {
		const oldName = oldProducts.find(
			(p) => p.id === setting.spotlightProductId,
		)?.name;
		const spotlight = created.find((p) => p.name === oldName)?.id ?? null;
		if (spotlight !== null)
			await tx.homeOfferSettings.update({
				where: { id: setting.id },
				data: { spotlightProductId: spotlight },
			});
		const current = await tx.homeOfferSettings.findUniqueOrThrow({
			where: { id: setting.id },
		});
		assertEqual(
			{ ...current, spotlightProductId: null, updatedAt: null },
			{ ...setting, spotlightProductId: null, updatedAt: null },
			"configuración home",
		);
		assertEqual(current.spotlightProductId, spotlight, "destacado home");
	}
	await verifyInitialCatalog(tx, catalog);
	assertEqual(
		await preservedDigests(tx),
		preserved,
		"usuarios, accesos, configuración, auditoría y QA conservados",
	);
	assertEqual(
		await tx.paymentProviderEvent.count({
			where: { userTransactionId: { not: null } },
		}),
		0,
		"referencias ledger a intentos eliminados",
	);
	for (const model of RESET_DELETE_ORDER.filter(
		(model) =>
			!["Product", "ProductClientTerms", "ProductSupplierTerms"].includes(
				model,
			),
	)) {
		const rows = await tx.$queryRaw<Array<{ count: number }>>(
			Prisma.sql`SELECT count(*)::int AS count FROM ${table(model)}`,
		);
		assertEqual(rows[0]?.count, 0, model);
	}
	return { inventory, result };
}

export async function runInitialCatalogReplacement(
	db: PrismaClient,
	catalog: Catalog,
) {
	return db.$transaction((tx) => replaceInitialCatalog(tx, catalog), {
		maxWait: 30_000,
		timeout: 180_000,
	});
}
