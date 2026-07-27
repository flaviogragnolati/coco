/**
 * One pass of all six operational-diagnostics calculators over the whole
 * database, shared by `scripts/seed-verify.ts` and `scripts/fulfillment-e2e.ts`
 * so "the sweep is clean" means the same thing in both.
 *
 * Reads through the same `list*Candidates` selects the admin services use, so a
 * rule that fires here is a rule an operator would see on the list page.
 */

import type { Prisma } from "~/prisma/client";
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

/**
 * Same shape the `*.data.ts` layer accepts, so both a `PrismaClient` and a
 * transaction client can be swept.
 */
type SweepDb = Prisma.TransactionClient;

/** Big enough to cover a seeded database plus a harness run in one page. */
const SCAN = 500;

export type SweptDiagnostic = OperationalDiagnostic & { scope: string };

export type DiagnosticsSweep = {
	criticals: SweptDiagnostic[];
	warnings: SweptDiagnostic[];
	counts: {
		operations: number;
		lots: number;
		supplierOrders: number;
		packages: number;
		shipments: number;
		carrierOrders: number;
	};
};

export async function sweepDiagnostics(db: SweepDb): Promise<DiagnosticsSweep> {
	const criticals: SweptDiagnostic[] = [];
	const warnings: SweptDiagnostic[] = [];

	const collect = (scope: string, diagnostics: OperationalDiagnostic[]) => {
		for (const diagnostic of diagnostics) {
			const entry = { ...diagnostic, scope };
			if (diagnostic.severity === "critical") criticals.push(entry);
			else warnings.push(entry);
		}
	};

	const [operations, staleOpenRollOverBefore] = await Promise.all([
		listOperationCandidates(db, operationListInputSchema.parse({}), {
			take: SCAN,
		}),
		findStaleOpenRollOverThreshold(db),
	]);
	for (const operation of operations) {
		collect(
			`operation ${operation.code}`,
			calculateOperationDiagnostics(operation, { staleOpenRollOverBefore }),
		);
	}

	const [lots, supplierOrders, packages, shipments, carrierOrders] =
		await Promise.all([
			listLotCandidates(db, lotListInputSchema.parse({}), { take: SCAN }),
			listSupplierOrderCandidates(db, supplierOrderListInputSchema.parse({}), {
				take: SCAN,
			}),
			listPackageCandidates(db, packageListInputSchema.parse({}), {
				take: SCAN,
			}),
			listShipmentCandidates(db, shipmentListInputSchema.parse({}), {
				take: SCAN,
			}),
			listCarrierOrderCandidates(
				db,
				carrierOrderListInputSchema.parse({ includeDeleted: true }),
				{ take: SCAN },
			),
		]);

	for (const lot of lots) {
		collect(`lot ${lot.code}`, calculateLotDiagnostics(lot));
	}
	for (const order of supplierOrders) {
		collect(
			`supplier order ${order.code}`,
			calculateSupplierOrderDiagnostics(order),
		);
	}
	for (const pkg of packages) {
		collect(`package ${pkg.name}`, calculatePackageDiagnostics(pkg));
	}

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

	for (const order of carrierOrders) {
		collect(
			`carrier order ${order.code}`,
			calculateCarrierOrderDiagnostics(order),
		);
	}

	return {
		criticals,
		warnings,
		counts: {
			operations: operations.length,
			lots: lots.length,
			supplierOrders: supplierOrders.length,
			packages: packages.length,
			shipments: shipments.length,
			carrierOrders: carrierOrders.length,
		},
	};
}

/** Groups warnings by code for a compact, still-visible summary. */
export function summarizeWarnings(warnings: SweptDiagnostic[]) {
	const byCode = new Map<string, number>();
	for (const warning of warnings) {
		byCode.set(warning.code, (byCode.get(warning.code) ?? 0) + 1);
	}
	return [...byCode].sort(([a], [b]) => a.localeCompare(b));
}
