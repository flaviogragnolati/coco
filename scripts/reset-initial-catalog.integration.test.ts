import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "~/prisma/client";
import { CATALOG_CATEGORY_NAMES } from "./lib/catalog-categories";
import {
	inventoryInitialCatalogReset,
	replaceInitialCatalog,
	runInitialCatalogReplacement,
	verifyInitialCatalog,
} from "./lib/reset-initial-catalog";
import {
	applySeedInitPlan,
	loadSeedInitState,
	toSeedInitCatalog,
} from "./lib/seed-init-core";
import { quintalCatalog } from "./quintal-catalog.data";
import { quintalCatalogSchema } from "./quintal-catalog.schema";
import { describeDatabaseTarget } from "./reset-initial-catalog.plan";
import { planSeedInit } from "./seed-init.plan";

const url = process.env.CATALOG_RESET_TEST_DATABASE_URL;
if (url) {
	describeDatabaseTarget(url);
	const parsed = new URL(url);
	if (
		!["127.0.0.1", "localhost"].includes(parsed.hostname) ||
		!parsed.pathname.endsWith("_test") ||
		describeDatabaseTarget(url) !== process.env.CATALOG_RESET_TEST_TARGET ||
		(process.env.DATABASE_URL &&
			describeDatabaseTarget(url) ===
				describeDatabaseTarget(process.env.DATABASE_URL))
	)
		throw new Error(
			"Integration tests require an explicit, isolated local *_test database target",
		);
}

describe.skipIf(!url)("initial catalog reset on isolated PostgreSQL", () => {
	let db: PrismaClient;
	const catalog = quintalCatalogSchema.parse(quintalCatalog);
	beforeAll(async () => {
		if (!url) throw new Error("Missing isolated database URL");
		db = new PrismaClient({
			adapter: new PrismaPg({ connectionString: url }),
			log: [],
		});
		const models = await db.$queryRaw<
			Array<{ name: string }>
		>`SELECT tablename as name FROM pg_tables WHERE schemaname='public'`;
		if (models.length)
			throw new Error(
				"Test database must be empty; existing data is never cleaned automatically",
			);
		const schemaPath = process.env.CATALOG_RESET_TEST_SCHEMA;
		if (!schemaPath)
			throw new Error(
				"CATALOG_RESET_TEST_SCHEMA must name SQL generated from the current Prisma schema",
			);
		const sql = readFileSync(schemaPath, "utf8");
		// Prisma raw queries accept one statement; the schema contains no routines.
		for (const statement of sql.split(";").filter((s) => s.trim()))
			await db.$executeRawUnsafe(statement);
		await db.category.createMany({
			data: CATALOG_CATEGORY_NAMES.map((name, i) => ({
				name,
				sortOrder: i + 1,
			})),
		});
		await db.supplier.create({
			data: {
				name: "Quintal",
				active: true,
				address: catalog.supplier.address,
				contactInfo: catalog.supplier.contactInfo,
			},
		});
		await db.user.create({
			data: {
				id: "reset-test-user",
				name: "Local fixture",
				email: "reset@example.invalid",
				role: "admin",
			},
		});
		await db.qaTicket.create({
			data: {
				title: "Keep QA",
				code: 1,
				section: "fixture",
				actor: "admin",
				feature: "reset",
				steps: "fixture",
				expectedResult: "fixture",
			},
		});
		await db.homeOfferSettings.create({ data: { id: 1 } });
		await db.$transaction(async (tx) => {
			const p = planSeedInit(
				toSeedInitCatalog(catalog),
				await loadSeedInitState(tx, catalog),
				new Date(),
			);
			await applySeedInitPlan(
				tx,
				p,
				catalog,
				new Date(catalog.source.listDate),
			);
		});
		const product = await db.product.findFirstOrThrow({
			where: { name: "Almendra Non Pareil 25/27" },
		});
		await db.product.update({
			where: { id: product.id },
			data: { homeOfferRank: 2 },
		});
		await db.homeOfferSettings.update({
			where: { id: 1 },
			data: { spotlightProductId: product.id },
		});
		await db.product.create({
			data: {
				name: "Old unrelated product",
				unit: "kg",
				active: false,
				deleted: true,
			},
		});
		const terms = await db.productClientTerms.findFirstOrThrow();
		const cart = await db.cart.create({
			data: { code: "reset-cart", userId: "reset-test-user" },
		});
		const item = await db.cartItem.create({
			data: {
				code: "reset-item",
				cartId: cart.id,
				productClientTermsId: terms.id,
				productSnapshot: { name: "fixture" },
				quantity: "1",
			},
		});
		const order = await db.userOrder.create({
			data: {
				code: "reset-order",
				userId: "reset-test-user",
				cartId: cart.id,
				status: "completed",
			},
		});
		await db.userOrderItem.create({
			data: {
				userOrderId: order.id,
				sourceCartItemId: item.id,
				quantity: "1",
				productSnapshot: { name: "fixture" },
				priceSnapshot: { price: 1 },
			},
		});
		const method = await db.paymentMethod.create({
			data: {
				userId: "reset-test-user",
				type: "cash",
				label: "Local",
				details: "fixture",
			},
		});
		const attempt = await db.userTransaction.create({
			data: {
				amount: "1",
				status: "completed",
				idempotencyKey: "reset-attempt",
				paymentMethodId: method.id,
				userOrderId: order.id,
			},
		});
		await db.paymentProviderEvent.create({
			data: {
				provider: "mock",
				providerEventId: "reset-event",
				status: "processed",
				userTransactionId: attempt.id,
				payload: { test: true },
			},
		});
		const supplierTerms = await db.productSupplierTerms.findFirstOrThrow();
		const destination = await db.destination.create({
			data: { name: "Local destination" },
		});
		const operation = await db.operation.create({
			data: { code: "reset-operation", destinationId: destination.id },
		});
		const purchase = await db.supplierOrder.create({
			data: { code: "reset-purchase", supplierId: supplierTerms.supplierId },
		});
		await db.supplierTransaction.create({
			data: { supplierOrderId: purchase.id, amount: "1" },
		});
		const lot = await db.lot.create({
			data: {
				code: "reset-lot",
				supplierId: supplierTerms.supplierId,
				operationId: operation.id,
				supplierOrderId: purchase.id,
			},
		});
		const lotItem = await db.lotItem.create({
			data: {
				code: "reset-lot-item",
				lotId: lot.id,
				supplierId: supplierTerms.supplierId,
				destinationId: destination.id,
				productSupplierTermsId: supplierTerms.id,
				quantity: "1",
			},
		});
		const allocation = await db.cartItemLotItem.create({
			data: { cartItemId: item.id, lotItemId: lotItem.id, quantity: "1" },
		});
		const carrier = await db.carrier.create({
			data: { name: "Local carrier", address: {}, contactInfo: {} },
		});
		const booking = await db.carrierOrder.create({
			data: { code: "reset-booking", carrierId: carrier.id },
		});
		const shipment = await db.shipment.create({
			data: {
				name: "Local shipment",
				internalCode: "reset-shipment",
				carrierOrderId: booking.id,
			},
		});
		const pack = await db.package.create({
			data: { name: "Local package", shipmentId: shipment.id },
		});
		const packLine = await db.packageLotItem.create({
			data: { packageId: pack.id, lotItemId: lotItem.id, quantity: "1" },
		});
		const packAllocation = await db.packageAllocation.create({
			data: {
				cartItemLotItemId: allocation.id,
				packageLotItemId: packLine.id,
				quantity: "1",
				sourcePackageId: pack.id,
			},
		});
		const rollover = await db.rollOver.create({
			data: {
				cartItemId: item.id,
				operationId: operation.id,
				stage: "preAllocation",
				quantity: "1",
				reason: "fixture",
			},
		});
		await db.cartItemTrackingEvent.create({
			data: {
				eventType: "packaged",
				cartItemId: item.id,
				operationId: operation.id,
				cartItemLotItemId: allocation.id,
				packageAllocationId: packAllocation.id,
				lotId: lot.id,
				lotItemId: lotItem.id,
				packageId: pack.id,
				shipmentId: shipment.id,
				rollOverId: rollover.id,
			},
		});
	}, 60_000);
	afterAll(async () => {
		await db?.$disconnect();
	});
	it("dry run is read-only and pending outbox blocks all writes", async () => {
		const before = await db.product.count();
		await db.$transaction((tx) => inventoryInitialCatalogReset(tx, catalog));
		expect(await db.product.count()).toBe(before);
		const event = await db.domainEventOutbox.create({
			data: {
				id: "reset-pending",
				eventKey: "reset-pending",
				eventType: "fixture",
				aggregateType: "Cart",
				aggregateId: "1",
				payload: {},
			},
		});
		await expect(runInitialCatalogReplacement(db, catalog)).rejects.toThrow(
			/outbox/,
		);
		expect(await db.product.count()).toBe(before);
		await db.domainEventOutbox.delete({ where: { id: event.id } });
	});
	it("rolls back when insertion fails after deleting all old products", async () => {
		const before = await db.product.findMany({ orderBy: { id: "asc" } });
		await db.$executeRawUnsafe(
			"CREATE FUNCTION reject_reset_terms() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected insert failure'; END $$",
		);
		await db.$executeRawUnsafe(
			"CREATE TRIGGER reject_reset_terms BEFORE INSERT ON product_client_terms FOR EACH ROW EXECUTE FUNCTION reject_reset_terms()",
		);
		try {
			await expect(runInitialCatalogReplacement(db, catalog)).rejects.toThrow();
			expect(await db.product.findMany({ orderBy: { id: "asc" } })).toEqual(
				before,
			);
			expect(await db.package.count()).toBe(1);
		} finally {
			await db.$executeRawUnsafe(
				"DROP TRIGGER reject_reset_terms ON product_client_terms",
			);
			await db.$executeRawUnsafe("DROP FUNCTION reject_reset_terms()");
		}
	});
	it("blocks concurrent writes until commit and rolls back the full reload on failure", async () => {
		const before = await db.product.findMany({ orderBy: { id: "asc" } });
		await expect(
			db.$transaction(
				async (tx) => {
					await replaceInitialCatalog(tx, catalog);
					await expect(
						db.$transaction(async (concurrent) => {
							await concurrent.$executeRaw`SET LOCAL lock_timeout = '100ms'`;
							await concurrent.product.create({
								data: { name: "Concurrent product", unit: "kg" },
							});
						}),
					).rejects.toThrow();
					throw new Error("injected failure after reload");
				},
				{ timeout: 60_000 },
			),
		).rejects.toThrow("injected failure");
		expect(await db.product.findMany({ orderBy: { id: "asc" } })).toEqual(
			before,
		);
		expect(await db.userOrder.count()).toBe(1);
		expect(
			(await db.paymentProviderEvent.findFirstOrThrow()).userTransactionId,
		).not.toBeNull();
	});
	it("replaces everything atomically while preserving access, QA, home and payment ledger", async () => {
		await runInitialCatalogReplacement(db, catalog);
		await db.$transaction((tx) => verifyInitialCatalog(tx, catalog));
		expect(await db.product.count()).toBe(27);
		expect(await db.userOrder.count()).toBe(0);
		expect(await db.cart.count()).toBe(0);
		expect(await db.user.count()).toBe(1);
		expect(await db.qaTicket.count()).toBe(1);
		expect(await db.paymentMethod.count()).toBe(1);
		expect(
			(await db.paymentProviderEvent.findFirstOrThrow()).userTransactionId,
		).toBeNull();
		const home = await db.homeOfferSettings.findUniqueOrThrow({
			where: { id: 1 },
		});
		if (home.spotlightProductId === null) throw new Error("Spotlight was lost");
		const product = await db.product.findUniqueOrThrow({
			where: { id: home.spotlightProductId },
		});
		expect(product.name).toBe("Almendra Non Pareil 25/27");
		expect(product.homeOfferRank).toBe(2);
		const input = toSeedInitCatalog(catalog);
		const outcome = await db.$transaction(async (tx) =>
			applySeedInitPlan(
				tx,
				planSeedInit(input, await loadSeedInitState(tx, catalog), new Date()),
				catalog,
				new Date(catalog.source.listDate),
			),
		);
		expect(outcome).toMatchObject({
			productsCreated: 0,
			supplierTermsCreated: 0,
			clientTermsCreated: 0,
		});
	}, 60_000);
});
