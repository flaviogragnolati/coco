/**
 * `pnpm db:purge-demo`: wipes every order, cart, payment attempt, operation and
 * shipment, plus the demo catalog of `prisma/seed.ts`. Users, Quintal, QA
 * tickets, payment config, pickup points, carriers, destinations, the audit log
 * and the outbox stay.
 *
 * Dry run by default: it only prints the inventory. `--apply` deletes inside a
 * single transaction, so a failure leaves the database as it was. The decisions
 * live in `purge-demo-data.plan.ts`.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "~/prisma/client";
import { resolveScriptAppEnv } from "./lib/seed-environment";
import {
	assertApplyAllowed,
	DEMO_SUPPLIER_NAMES,
	type DemoPurgePlan,
	type KeptModel,
	parsePurgeArgs,
	planDemoPurge,
	TRANSACTIONAL_DELETE_ORDER,
	type TransactionalModel,
} from "./purge-demo-data.plan";
import { quintalCatalog } from "./quintal-catalog.data";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is required to run scripts/purge-demo-data.ts");
}

const args = parsePurgeArgs(process.argv.slice(2));
const appEnv = resolveScriptAppEnv(process.env);
assertApplyAllowed(appEnv, args);

const db = new PrismaClient({
	adapter: new PrismaPg({ connectionString: DATABASE_URL }),
	log: ["error", "warn"],
});

type Tx = Prisma.TransactionClient;

// Events never matched to an attempt are the webhook ledger and its dedupe
// key, not order data.
const linkedEvent = { userTransactionId: { not: null } };

const transactional: Record<
	TransactionalModel,
	{
		label: string;
		count: (tx: Tx) => Promise<number>;
		purge: (tx: Tx) => Promise<{ count: number }>;
	}
> = {
	CartItemTrackingEvent: {
		label: "Eventos de tracking",
		count: (tx) => tx.cartItemTrackingEvent.count(),
		purge: (tx) => tx.cartItemTrackingEvent.deleteMany(),
	},
	PackageAllocation: {
		label: "Asignaciones a paquetes",
		count: (tx) => tx.packageAllocation.count(),
		purge: (tx) => tx.packageAllocation.deleteMany(),
	},
	PackageLotItem: {
		label: "Líneas de paquete",
		count: (tx) => tx.packageLotItem.count(),
		purge: (tx) => tx.packageLotItem.deleteMany(),
	},
	Package: {
		label: "Paquetes",
		count: (tx) => tx.package.count(),
		purge: (tx) => tx.package.deleteMany(),
	},
	Shipment: {
		label: "Envíos",
		count: (tx) => tx.shipment.count(),
		purge: (tx) => tx.shipment.deleteMany(),
	},
	CarrierOrder: {
		label: "Órdenes de transporte",
		count: (tx) => tx.carrierOrder.count(),
		purge: (tx) => tx.carrierOrder.deleteMany(),
	},
	CartItemLotItem: {
		label: "Asignaciones de ítems a lotes",
		count: (tx) => tx.cartItemLotItem.count(),
		purge: (tx) => tx.cartItemLotItem.deleteMany(),
	},
	RollOver: {
		label: "Roll overs",
		count: (tx) => tx.rollOver.count(),
		purge: (tx) => tx.rollOver.deleteMany(),
	},
	LotItem: {
		label: "Ítems de lote",
		count: (tx) => tx.lotItem.count(),
		purge: (tx) => tx.lotItem.deleteMany(),
	},
	Lot: {
		label: "Lotes",
		count: (tx) => tx.lot.count(),
		purge: (tx) => tx.lot.deleteMany(),
	},
	Operation: {
		label: "Operaciones",
		count: (tx) => tx.operation.count(),
		purge: (tx) => tx.operation.deleteMany(),
	},
	SupplierTransaction: {
		label: "Pagos a proveedores",
		count: (tx) => tx.supplierTransaction.count(),
		purge: (tx) => tx.supplierTransaction.deleteMany(),
	},
	SupplierOrder: {
		label: "Órdenes de proveedor",
		count: (tx) => tx.supplierOrder.count(),
		purge: (tx) => tx.supplierOrder.deleteMany(),
	},
	PaymentProviderEvent: {
		label: "Eventos de pago ligados a un intento",
		count: (tx) => tx.paymentProviderEvent.count({ where: linkedEvent }),
		purge: (tx) => tx.paymentProviderEvent.deleteMany({ where: linkedEvent }),
	},
	UserTransaction: {
		label: "Intentos de pago",
		count: (tx) => tx.userTransaction.count(),
		purge: (tx) => tx.userTransaction.deleteMany(),
	},
	UserOrderItem: {
		label: "Ítems de pedido",
		count: (tx) => tx.userOrderItem.count(),
		purge: (tx) => tx.userOrderItem.deleteMany(),
	},
	UserOrder: {
		label: "Pedidos",
		count: (tx) => tx.userOrder.count(),
		purge: (tx) => tx.userOrder.deleteMany(),
	},
	CartItem: {
		label: "Ítems de carrito",
		count: (tx) => tx.cartItem.count(),
		purge: (tx) => tx.cartItem.deleteMany(),
	},
	Cart: {
		label: "Carritos",
		count: (tx) => tx.cart.count(),
		purge: (tx) => tx.cart.deleteMany(),
	},
};

const kept: Record<
	KeptModel,
	{ label: string; count: (tx: Tx) => Promise<number> }
> = {
	User: { label: "Usuarios", count: (tx) => tx.user.count() },
	Session: { label: "Sesiones", count: (tx) => tx.session.count() },
	Account: { label: "Cuentas de login", count: (tx) => tx.account.count() },
	Verification: {
		label: "Verificaciones",
		count: (tx) => tx.verification.count(),
	},
	Address: { label: "Direcciones", count: (tx) => tx.address.count() },
	PaymentMethod: {
		label: "Medios de pago",
		count: (tx) => tx.paymentMethod.count(),
	},
	PaymentProviderConfig: {
		label: "Configuración de pagos",
		count: (tx) => tx.paymentProviderConfig.count(),
	},
	Carrier: { label: "Transportistas", count: (tx) => tx.carrier.count() },
	PickupPoint: {
		label: "Puntos de retiro",
		count: (tx) => tx.pickupPoint.count(),
	},
	Destination: { label: "Destinos", count: (tx) => tx.destination.count() },
	Channel: { label: "Canales", count: (tx) => tx.channel.count() },
	HomeOfferSettings: {
		label: "Configuración del home",
		count: (tx) => tx.homeOfferSettings.count(),
	},
	AuditLog: { label: "Auditoría", count: (tx) => tx.auditLog.count() },
	DomainEventOutbox: {
		label: "Outbox de eventos",
		count: (tx) => tx.domainEventOutbox.count(),
	},
	QaTicket: { label: "Tickets de QA", count: (tx) => tx.qaTicket.count() },
	QaTicketEvidence: {
		label: "Evidencia de QA",
		count: (tx) => tx.qaTicketEvidence.count(),
	},
	GlossaryProposal: {
		label: "Propuestas de glosario",
		count: (tx) => tx.glossaryProposal.count(),
	},
	SupplierApplication: {
		label: "Solicitudes de proveedores",
		count: (tx) => tx.supplierApplication.count(),
	},
};

type Counts = Array<{ label: string; count: number }>;

type Inventory = {
	plan: DemoPurgePlan;
	transactional: Counts;
	kept: Counts;
	unlinkedPaymentEvents: number;
	unsettledOutboxEvents: number;
	spotlightProductId: number | null;
};

const flags = { active: true, deleted: true } as const;

async function loadInventory(tx: Tx): Promise<Inventory> {
	const [suppliers, products, brands, supplierTerms, clientTerms] =
		await Promise.all([
			tx.supplier.findMany({ select: { id: true, name: true, ...flags } }),
			tx.product.findMany({
				select: {
					id: true,
					name: true,
					defaultSupplierId: true,
					brandId: true,
					homeOfferRank: true,
					...flags,
				},
			}),
			tx.brand.findMany({ select: { id: true, name: true } }),
			tx.productSupplierTerms.findMany({
				select: { id: true, productId: true, supplierId: true },
			}),
			tx.productClientTerms.findMany({
				select: { id: true, productId: true },
			}),
		]);
	const localConstraints = await tx.productLocalConstraints.findMany({
		select: { id: true, productId: true },
	});
	const settings = await tx.homeOfferSettings.findUnique({
		where: { id: 1 },
		select: { spotlightProductId: true },
	});
	const spotlightProductId = settings?.spotlightProductId ?? null;

	const plan = planDemoPurge(
		{
			quintalSupplierName: quintalCatalog.supplier.name,
			demoSupplierNames: DEMO_SUPPLIER_NAMES,
		},
		{
			suppliers,
			products,
			brands,
			supplierTerms,
			clientTerms,
			localConstraints,
			spotlightProductId,
		},
	);

	const transactionalCounts: Counts = [];
	for (const model of TRANSACTIONAL_DELETE_ORDER) {
		const { label, count } = transactional[model];
		transactionalCounts.push({ label, count: await count(tx) });
	}
	const keptCounts: Counts = [];
	for (const { label, count } of Object.values(kept)) {
		keptCounts.push({ label, count: await count(tx) });
	}

	return {
		plan,
		transactional: transactionalCounts,
		kept: keptCounts,
		unlinkedPaymentEvents: await tx.paymentProviderEvent.count({
			where: { userTransactionId: null },
		}),
		unsettledOutboxEvents: await tx.domainEventOutbox.count({
			where: { status: { in: ["pending", "processing", "failed"] } },
		}),
		spotlightProductId,
	};
}

async function purge(tx: Tx, plan: DemoPurgePlan) {
	const deleted: Counts = [];
	for (const model of TRANSACTIONAL_DELETE_ORDER) {
		const { label, purge } = transactional[model];
		deleted.push({ label, count: (await purge(tx)).count });
	}

	const { demo } = plan;
	if (demo.clearSpotlight) {
		await tx.homeOfferSettings.update({
			where: { id: 1 },
			data: { spotlightProductId: null },
		});
	}

	// Exact counts: a row that vanished or appeared since the plan was read
	// means the plan is stale, so the whole transaction rolls back.
	const exact = async (
		label: string,
		ids: number[],
		run: (ids: number[]) => Promise<{ count: number }>,
	) => {
		if (ids.length === 0) return;
		const { count } = await run(ids);
		if (count !== ids.length) {
			throw new Error(
				`${label}: se esperaban ${ids.length} filas y se borraron ${count}.`,
			);
		}
		deleted.push({ label, count });
	};
	await exact("Restricciones locales demo", demo.localConstraintIds, (ids) =>
		tx.productLocalConstraints.deleteMany({ where: { id: { in: ids } } }),
	);
	await exact("Términos de cliente demo", demo.clientTermIds, (ids) =>
		tx.productClientTerms.deleteMany({ where: { id: { in: ids } } }),
	);
	await exact("Términos de proveedor demo", demo.supplierTermIds, (ids) =>
		tx.productSupplierTerms.deleteMany({ where: { id: { in: ids } } }),
	);
	await exact(
		"Productos demo",
		demo.products.map((product) => product.id),
		(ids) => tx.product.deleteMany({ where: { id: { in: ids } } }),
	);
	await exact(
		"Proveedores demo",
		demo.suppliers.map((supplier) => supplier.id),
		(ids) => tx.supplier.deleteMany({ where: { id: { in: ids } } }),
	);
	await exact(
		"Marcas demo",
		demo.brands.map((brand) => brand.id),
		(ids) => tx.brand.deleteMany({ where: { id: { in: ids } } }),
	);
	return deleted;
}

function describeTarget(url: string) {
	try {
		const parsed = new URL(url);
		return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}`;
	} catch {
		return "(DATABASE_URL ilegible)";
	}
}

function printCounts(counts: Counts) {
	for (const { label, count } of counts) console.info(`  ${label}: ${count}`);
}

function printInventory(inventory: Inventory) {
	const { plan } = inventory;
	const { demo } = plan;

	console.info("\nSe borra todo lo transaccional:");
	printCounts(inventory.transactional);

	console.info("\nSe borra el catálogo demo:");
	console.info(`  Proveedores (${demo.suppliers.length}):`);
	for (const supplier of demo.suppliers) {
		console.info(`    - #${supplier.id} ${supplier.name}`);
	}
	console.info(`  Productos (${demo.products.length}):`);
	for (const product of demo.products) {
		const tags = [
			product.deleted ? "eliminado" : product.active ? null : "inactivo",
			product.homeOfferRank === null
				? null
				: `fijado en el home, puesto ${product.homeOfferRank}`,
		].filter(Boolean);
		console.info(
			`    - #${product.id} ${product.name} (${product.supplierName})${tags.length ? ` [${tags.join(", ")}]` : ""}`,
		);
	}
	console.info(`  Marcas (${demo.brands.length}):`);
	for (const brand of demo.brands) {
		console.info(`    - #${brand.id} ${brand.name}`);
	}
	console.info(
		`  Términos de cliente: ${demo.clientTermIds.length}, términos de proveedor: ${demo.supplierTermIds.length}, restricciones locales: ${demo.localConstraintIds.length}`,
	);
	if (demo.clearSpotlight) {
		console.info(
			`  El producto destacado del home (#${inventory.spotlightProductId}) es demo: queda vacío y el home usa el primero del ranking.`,
		);
	}

	console.info("\nSe conserva:");
	for (const supplier of plan.quintal.suppliers) {
		console.info(`  Proveedor #${supplier.id} ${supplier.name}`);
	}
	console.info(
		`  Productos de Quintal: ${plan.quintal.productIds.length}, con sus términos y restricciones`,
	);
	printCounts(inventory.kept);
	console.info(
		`  Eventos de pago sin intento asociado: ${inventory.unlinkedPaymentEvents}`,
	);
	for (const brand of plan.sharedBrands) {
		console.info(
			`  Marca #${brand.id} ${brand.name}: la usan productos que se conservan (ids ${brand.keptProductIds.join(", ")})`,
		);
	}

	const { unclassified } = plan;
	if (unclassified.suppliers.length + unclassified.products.length > 0) {
		console.info("\nSin clasificar (no se borra; revisar a mano):");
		for (const supplier of unclassified.suppliers) {
			console.info(
				`  - Proveedor #${supplier.id} ${supplier.name}: ${supplier.reason}`,
			);
		}
		for (const product of unclassified.products) {
			console.info(
				`  - Producto #${product.id} ${product.name}: ${product.reason}`,
			);
		}
	}

	if (inventory.unsettledOutboxEvents > 0) {
		console.warn(
			`\nAviso: el outbox tiene ${inventory.unsettledOutboxEvents} eventos sin procesar; pueden apuntar a filas que se borran.`,
		);
	}
	if (plan.blockers.length > 0) {
		console.error("\nNo se puede aplicar:");
		for (const blocker of plan.blockers) console.error(`  - ${blocker}`);
	}
}

async function main() {
	console.info(
		`Purga de datos demo · base ${describeTarget(DATABASE_URL ?? "")} · APP_ENV=${appEnv}`,
	);

	if (!args.apply) {
		const inventory = await loadInventory(db);
		printInventory(inventory);
		console.info(
			"\nSimulación: no se borró nada. Para aplicar: pnpm db:purge-demo --apply",
		);
		if (inventory.plan.blockers.length > 0) process.exitCode = 1;
		return;
	}

	const { inventory, deleted } = await db.$transaction(
		async (tx) => {
			const inventory = await loadInventory(tx);
			if (inventory.plan.blockers.length > 0) {
				printInventory(inventory);
				throw new Error("La purga tiene bloqueos; no se aplicó.");
			}
			return { inventory, deleted: await purge(tx, inventory.plan) };
		},
		{ maxWait: 30_000, timeout: 180_000 },
	);

	printInventory(inventory);
	console.info("\nAplicado. Filas borradas:");
	printCounts(deleted);
}

main()
	.catch((error) => {
		console.error(
			args.apply
				? "db:purge-demo falló; la transacción se revirtió y no se borró nada."
				: "db:purge-demo falló.",
		);
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
