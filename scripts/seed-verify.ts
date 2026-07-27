/**
 * Verifies a freshly seeded database against the code that owns each fact:
 *
 * 1. every seeded cart item's stored `fulfillmentStatus` equals what
 *    `deriveFulfillmentStatus` returns for its lineage (ADR 0002);
 * 2. no `critical` diagnostic anywhere, across all six calculators;
 * 3. every operation's stored counters equal `computeOperationCounters`;
 * 4. every value of every fulfillment enum appears at least once, except the
 *    statuses no shipped command can produce, which are named explicitly;
 * 5. a pool of aggregable demand survives, so `scripts/fulfillment-e2e.ts` has
 *    something to execute.
 *
 * Run with `pnpm db:seed-verify`. The `--conditions=react-server` flag in that
 * script is mandatory: `fulfillment-lineage.data.ts` imports `server-only`, which
 * resolves to an empty module only under that condition and otherwise throws
 * "This module cannot be imported from a Client Component module".
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "~/prisma/client";
import { carrierOrderListInputSchema } from "~/schemas/admin/carrier-order.schemas";
import { lotListInputSchema } from "~/schemas/admin/lot.schemas";
import { operationListInputSchema } from "~/schemas/admin/operation.schemas";
import { packageListInputSchema } from "~/schemas/admin/package.schemas";
import { shipmentListInputSchema } from "~/schemas/admin/shipment.schemas";
import { supplierOrderListInputSchema } from "~/schemas/admin/supplier-order.schemas";
import { listCarrierOrderCandidates } from "~/server/services/admin/carrier-order.data";
import { calculateCarrierOrderDiagnostics } from "~/server/services/admin/carrier-order-diagnostics";
import { listLotCandidates } from "~/server/services/admin/lot.data";
import { calculateLotDiagnostics } from "~/server/services/admin/lot-diagnostics";
import {
	findStaleOpenRollOverThreshold,
	listOperationCandidates,
} from "~/server/services/admin/operation.data";
import { calculateOperationDiagnostics } from "~/server/services/admin/operation-diagnostics";
import type { OperationalDiagnostic } from "~/server/services/admin/operational-diagnostics.types";
import { listPackageCandidates } from "~/server/services/admin/package.data";
import { calculatePackageDiagnostics } from "~/server/services/admin/package-diagnostics";
import {
	listShipmentCandidates,
	listShipmentIdsWithTrackingEvents,
} from "~/server/services/admin/shipment.data";
import { calculateShipmentDiagnostics } from "~/server/services/admin/shipment-diagnostics";
import { listSupplierOrderCandidates } from "~/server/services/admin/supplier-order.data";
import { calculateSupplierOrderDiagnostics } from "~/server/services/admin/supplier-order-diagnostics";
import { computeOperationCounters } from "~/server/services/operations/operation-counters";
import { loadFulfillmentLineageSnapshot } from "~/server/services/tracking/fulfillment-lineage.data";
import { deriveFulfillmentStatus } from "~/server/services/tracking/fulfillment-status.derivation";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is required to run scripts/seed-verify.ts");
}

const db = new PrismaClient({
	adapter: new PrismaPg({ connectionString: DATABASE_URL }),
	log: ["error"],
});

/** Big enough to cover the whole seed in one page. */
const SCAN = 500;

/**
 * Statuses declared in the ladders that **no command writes**, so a fixture for
 * them would be drift rather than coverage. Verified against the producers:
 * `operation-execution` creates lots at `assembling`, `createInboundPackage` /
 * `createOutboundPackage` / `createSiblingPackage` at `readyForShipment`,
 * `createPackageLines` at `packed`, and every `createShipment` call site passes
 * `readyForDispatch`. Nothing writes a shipment back to `cancelled` — there is no
 * `shipment.cancel` command.
 */
const UNPRODUCED_VALUES = new Set([
	"LotStatus.pending",
	"PackageStatus.pending",
	"PackageStatus.packing",
	"PackageLotItemStatus.pending",
	"PackageLotItemStatus.packing",
	"ShipmentStatus.pending",
	"ShipmentStatus.preparing",
	"ShipmentStatus.cancelled",
]);

const failures: string[] = [];
const warnings: OperationalDiagnostic[] = [];

function fail(message: string) {
	failures.push(message);
}

function collect(scope: string, diagnostics: OperationalDiagnostic[]) {
	for (const diagnostic of diagnostics) {
		if (diagnostic.severity === "critical") {
			fail(`critical ${diagnostic.code} on ${scope}: ${diagnostic.message}`);
			continue;
		}
		warnings.push(diagnostic);
	}
}

async function verifyDerivation() {
	const cartItems = await db.cartItem.findMany({
		where: { code: { startsWith: "CITEM-SEED-" } },
		select: { id: true, code: true, fulfillmentStatus: true },
		orderBy: { id: "asc" },
	});

	// One snapshot query per cart item against a remote database, so they go out in
	// batches — serially this is the slowest part of the script by an order of
	// magnitude.
	const BATCH = 10;
	for (let index = 0; index < cartItems.length; index += BATCH) {
		const batch = cartItems.slice(index, index + BATCH);
		const snapshots = await Promise.all(
			batch.map((cartItem) => loadFulfillmentLineageSnapshot(db, cartItem.id)),
		);

		batch.forEach((cartItem, offset) => {
			const snapshot = snapshots[offset];
			if (!snapshot) {
				fail(`${cartItem.code}: no lineage snapshot`);
				return;
			}

			const derived = deriveFulfillmentStatus(snapshot);
			if (derived !== cartItem.fulfillmentStatus) {
				fail(
					`${cartItem.code}: stored ${cartItem.fulfillmentStatus}, derived ${derived}`,
				);
			}
		});
	}

	return cartItems.length;
}

async function verifyDiagnostics() {
	const operations = await listOperationCandidates(
		db,
		operationListInputSchema.parse({}),
		{ take: SCAN },
	);
	const staleOpenRollOverBefore = await findStaleOpenRollOverThreshold(db);
	for (const operation of operations) {
		collect(
			`operation ${operation.code}`,
			calculateOperationDiagnostics(operation, { staleOpenRollOverBefore }),
		);
	}

	const lots = await listLotCandidates(db, lotListInputSchema.parse({}), {
		take: SCAN,
	});
	for (const lot of lots) {
		collect(`lot ${lot.code}`, calculateLotDiagnostics(lot));
	}

	const supplierOrders = await listSupplierOrderCandidates(
		db,
		supplierOrderListInputSchema.parse({}),
		{ take: SCAN },
	);
	for (const order of supplierOrders) {
		collect(
			`supplier order ${order.code}`,
			calculateSupplierOrderDiagnostics(order),
		);
	}

	const packages = await listPackageCandidates(
		db,
		packageListInputSchema.parse({}),
		{ take: SCAN },
	);
	for (const pkg of packages) {
		collect(`package ${pkg.name}`, calculatePackageDiagnostics(pkg));
	}

	const shipments = await listShipmentCandidates(
		db,
		shipmentListInputSchema.parse({}),
		{ take: SCAN },
	);
	// Same derivation the service uses (`shipment.service.ts`): passing `false`
	// would make `shipment.trackingEvents.missing` fire on every advanced shipment.
	const withTrackingEvents = await listShipmentIdsWithTrackingEvents(
		db,
		shipments.map((shipment) => shipment.id),
	);
	for (const shipment of shipments) {
		collect(
			`shipment ${shipment.internalCode}`,
			calculateShipmentDiagnostics(
				shipment,
				withTrackingEvents.has(shipment.id),
			),
		);
	}

	const carrierOrders = await listCarrierOrderCandidates(
		db,
		carrierOrderListInputSchema.parse({ includeDeleted: true }),
		{ take: SCAN },
	);
	for (const order of carrierOrders) {
		collect(
			`carrier order ${order.code}`,
			calculateCarrierOrderDiagnostics(order),
		);
	}

	return {
		operations: operations.length,
		lots: lots.length,
		supplierOrders: supplierOrders.length,
		packages: packages.length,
		shipments: shipments.length,
		carrierOrders: carrierOrders.length,
	};
}

async function verifyCounters() {
	const operations = await db.operation.findMany({
		where: { code: { startsWith: "OP-SEED-" } },
		select: {
			code: true,
			assignedQuantity: true,
			rollOverQuantity: true,
			assignedItemCount: true,
			rollOverItemCount: true,
			lotCount: true,
			supplierOrderCount: true,
			eligibleQuantity: true,
			status: true,
			lots: {
				select: {
					status: true,
					supplierOrderId: true,
					lotItems: {
						select: {
							status: true,
							quantity: true,
							cartItemLotItems: {
								select: { cartItemId: true, quantity: true },
							},
						},
					},
				},
			},
			rollOvers: { select: { cartItemId: true, status: true, quantity: true } },
		},
		orderBy: { id: "asc" },
	});

	for (const operation of operations) {
		const expected = computeOperationCounters(operation);

		const mismatches: string[] = [];
		if (!expected.assignedQuantity.equals(operation.assignedQuantity)) {
			mismatches.push(
				`assignedQuantity ${operation.assignedQuantity.toString()} ≠ ${expected.assignedQuantity.toString()}`,
			);
		}
		if (!expected.rollOverQuantity.equals(operation.rollOverQuantity)) {
			mismatches.push(
				`rollOverQuantity ${operation.rollOverQuantity.toString()} ≠ ${expected.rollOverQuantity.toString()}`,
			);
		}
		for (const key of [
			"assignedItemCount",
			"rollOverItemCount",
			"lotCount",
			"supplierOrderCount",
		] as const) {
			if (expected[key] !== operation[key]) {
				mismatches.push(`${key} ${operation[key]} ≠ ${expected[key]}`);
			}
		}

		// A cancelled operation keeps the frozen pre-compensation snapshot, which is
		// why §14 exempts it from the balance rule; every other status must balance.
		if (operation.status !== "cancelled") {
			const balance = expected.assignedQuantity.plus(expected.rollOverQuantity);
			if (!balance.equals(operation.eligibleQuantity)) {
				mismatches.push(
					`eligibleQuantity ${operation.eligibleQuantity.toString()} ≠ assigned + rollOver ${balance.toString()}`,
				);
			}
		}

		if (mismatches.length > 0) {
			fail(`${operation.code}: ${mismatches.join("; ")}`);
		}
	}

	return operations.length;
}

type CoverageGroup = {
	enumName: string;
	values: readonly string[];
	seen: () => Promise<string[]>;
};

async function distinct<T extends { _count: unknown }>(
	rows: Array<T & Record<string, unknown>>,
	key: string,
) {
	return rows.map((row) => String(row[key]));
}

async function verifyCoverage() {
	const groups: CoverageGroup[] = [
		{
			enumName: "CartItemFulfillmentStatus",
			values: [
				"awaitingAggregation",
				"includedInOperation",
				"allocatedToSupplierItem",
				"requestedFromSupplier",
				"supplierConfirmed",
				"packaged",
				"inInternalShipment",
				"atWarehouse",
				"inEndUserShipment",
				"delivered",
				"partiallyRolledOver",
				"rolledOver",
				"cancelled",
				"exception",
			],
			seen: async () =>
				distinct(
					await db.cartItem.groupBy({
						by: ["fulfillmentStatus"],
						_count: { _all: true },
					}),
					"fulfillmentStatus",
				),
		},
		{
			enumName: "CartItemTrackingEventType",
			values: [
				"addedToCart",
				"submittedToOrder",
				"cartItemQuantityChanged",
				"cartItemRemoved",
				"cartItemCancelled",
				"fulfillmentException",
				"includedInOperation",
				"rolledOverPreAllocation",
				"allocatedToLotItem",
				"includedInSupplierOrder",
				"supplierConfirmed",
				"packaged",
				"movedInInternalShipment",
				"receivedAtWarehouse",
				"movedInEndUserShipment",
				"arrivedAtPickupPoint",
				"delivered",
				"rolledOverPostAllocation",
				"rollOverResolved",
				"excludedFromOperation",
				"exceptionResolved",
			],
			seen: async () =>
				distinct(
					await db.cartItemTrackingEvent.groupBy({
						by: ["eventType"],
						_count: { _all: true },
					}),
					"eventType",
				),
		},
		{
			enumName: "OperationStatus",
			values: ["running", "completed", "failed", "cancelled"],
			seen: async () =>
				distinct(
					await db.operation.groupBy({
						by: ["status"],
						_count: { _all: true },
					}),
					"status",
				),
		},
		{
			enumName: "SupplierOrderStatus",
			values: [
				"pending",
				"requested",
				"confirmed",
				"readyForReceipt",
				"completed",
				"cancelled",
			],
			seen: async () =>
				distinct(
					await db.supplierOrder.groupBy({
						by: ["status"],
						_count: { _all: true },
					}),
					"status",
				),
		},
		{
			enumName: "LotStatus",
			values: [
				"pending",
				"assembling",
				"requested",
				"confirmed",
				"readyForPackaging",
				"completed",
				"cancelled",
			],
			seen: async () =>
				distinct(
					await db.lot.groupBy({ by: ["status"], _count: { _all: true } }),
					"status",
				),
		},
		{
			enumName: "LotItemStatus",
			values: [
				"pending",
				"requested",
				"confirmed",
				"readyForPackaging",
				"completed",
				"cancelled",
			],
			seen: async () =>
				distinct(
					await db.lotItem.groupBy({ by: ["status"], _count: { _all: true } }),
					"status",
				),
		},
		{
			enumName: "PackageStatus",
			values: [
				"pending",
				"packing",
				"readyForShipment",
				"inTransit",
				"received",
				"delayed",
				"failed",
				"cancelled",
			],
			seen: async () =>
				distinct(
					await db.package.groupBy({ by: ["status"], _count: { _all: true } }),
					"status",
				),
		},
		{
			enumName: "PackageLeg",
			values: ["inbound", "outbound"],
			seen: async () =>
				distinct(
					await db.package.groupBy({ by: ["leg"], _count: { _all: true } }),
					"leg",
				),
		},
		{
			enumName: "PackageLotItemStatus",
			values: [
				"pending",
				"packing",
				"packed",
				"shipped",
				"received",
				"cancelled",
			],
			seen: async () =>
				distinct(
					await db.packageLotItem.groupBy({
						by: ["status"],
						_count: { _all: true },
					}),
					"status",
				),
		},
		{
			enumName: "ShipmentStatus",
			values: [
				"pending",
				"preparing",
				"readyForDispatch",
				"inTransit",
				"received",
				"delayed",
				"failed",
				"cancelled",
			],
			seen: async () =>
				distinct(
					await db.shipment.groupBy({ by: ["status"], _count: { _all: true } }),
					"status",
				),
		},
		{
			enumName: "DeliveryMode",
			values: ["homeDelivery", "pickupPoint"],
			seen: async () =>
				distinct(
					await db.shipment.groupBy({
						by: ["deliveryMode"],
						where: { deliveryMode: { not: null } },
						_count: { _all: true },
					}),
					"deliveryMode",
				),
		},
		{
			enumName: "CarrierOrderStatus",
			values: [
				"pending",
				"requested",
				"confirmed",
				"inTransit",
				"completed",
				"cancelled",
				"failed",
			],
			seen: async () =>
				distinct(
					await db.carrierOrder.groupBy({
						by: ["status"],
						_count: { _all: true },
					}),
					"status",
				),
		},
		{
			enumName: "RollOverStage",
			values: ["preAllocation", "postAllocation"],
			seen: async () =>
				distinct(
					await db.rollOver.groupBy({ by: ["stage"], _count: { _all: true } }),
					"stage",
				),
		},
		{
			enumName: "RollOverStatus",
			values: ["open", "rebatched", "resolved", "cancelled"],
			seen: async () =>
				distinct(
					await db.rollOver.groupBy({ by: ["status"], _count: { _all: true } }),
					"status",
				),
		},
	];

	const rows: Array<{
		enum: string;
		covered: string;
		missing: string;
		intentional: string;
	}> = [];

	for (const group of groups) {
		const seen = new Set(await group.seen());
		const missing = group.values.filter((value) => !seen.has(value));
		const unproduced = missing.filter((value) =>
			UNPRODUCED_VALUES.has(`${group.enumName}.${value}`),
		);
		const unexpected = missing.filter(
			(value) => !UNPRODUCED_VALUES.has(`${group.enumName}.${value}`),
		);

		if (unexpected.length > 0) {
			fail(`${group.enumName}: uncovered ${unexpected.join(", ")}`);
		}

		rows.push({
			enum: group.enumName,
			covered: `${group.values.length - missing.length}/${group.values.length}`,
			missing: unexpected.join(", ") || "—",
			intentional: unproduced.join(", ") || "—",
		});
	}

	return rows;
}

/**
 * The demand `operation.createAndExecute` can still pick up: paid, submitted,
 * unallocated and free of open roll overs. The end-to-end harness starts from it,
 * so a seed edit that consumes the last of it has to fail here rather than three
 * phases later.
 */
async function verifyAggregablePool() {
	const count = await db.userOrderItem.count({
		where: {
			userOrder: {
				transactions: {
					some: { status: "completed", completedAt: { not: null } },
				},
			},
			sourceCartItem: {
				deleted: false,
				status: "submitted",
				cart: { deleted: false, status: "submitted" },
				cartItemLotItems: {
					none: {
						lotItem: {
							status: { not: "cancelled" },
							lot: { status: { not: "cancelled" } },
						},
					},
				},
				rollOvers: { none: { status: "open" } },
			},
		},
	});

	if (count === 0) {
		fail(
			"no aggregable demand left in the seed — the e2e harness has nothing to execute",
		);
	}

	return count;
}

async function step<T>(label: string, run: () => Promise<T>): Promise<T> {
	const startedAt = Date.now();
	const result = await run();
	console.log(`  ${label} — ${Date.now() - startedAt}ms`);
	return result;
}

async function main() {
	const cartItemCount = await step("derivation", verifyDerivation);
	const scanned = await step("diagnostics", verifyDiagnostics);
	const operationCount = await step("counters", verifyCounters);
	const coverage = await step("coverage", verifyCoverage);
	const aggregable = await step("aggregable pool", verifyAggregablePool);

	console.log("\nState coverage");
	console.table(coverage);

	console.log(
		`\nScanned ${cartItemCount} seeded cart items, ${operationCount} operations, ` +
			`${scanned.lots} lots, ${scanned.supplierOrders} supplier orders, ` +
			`${scanned.packages} packages, ${scanned.shipments} shipments, ` +
			`${scanned.carrierOrders} carrier orders.`,
	);
	console.log(`Aggregable demand rows: ${aggregable}`);

	if (warnings.length > 0) {
		console.log(
			`\nWarnings (${warnings.length}) — expected, listed so they stay visible:`,
		);
		const byCode = new Map<string, number>();
		for (const warning of warnings) {
			byCode.set(warning.code, (byCode.get(warning.code) ?? 0) + 1);
		}
		for (const [code, count] of [...byCode].sort()) {
			console.log(`  ${code} ×${count}`);
		}
	}

	if (failures.length > 0) {
		console.error(`\n${failures.length} failure(s):`);
		for (const failure of failures) console.error(`  ✗ ${failure}`);
		process.exitCode = 1;
		return;
	}

	console.log(
		"\nSeed verified: derivation, counters, diagnostics and coverage all agree.",
	);
}

main()
	.catch((error) => {
		console.error("Seed verification failed");
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
