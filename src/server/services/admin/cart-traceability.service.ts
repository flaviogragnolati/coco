import { cartTraceabilityDetailSchema } from "~/schemas/admin/cart-traceability.schemas";
import type { db } from "~/server/db";
import { TrackingEventService } from "~/server/services/tracking/tracking-event.service";
import type { CartTraceabilityDetail } from "~/shared/common/cart-traceability.types";
import { throwNotFound } from "./_base/admin-crud.errors";
import {
	assembleCartTraceability,
	type CartTraceabilityDiagnosticsMaps,
	groupTimelineByCartItem,
} from "./cart-traceability.assembler";
import {
	collectLineageEntityIds,
	getCartTraceabilityRecord,
} from "./cart-traceability.data";
import { type LotDetailRecord, listLotsByIds } from "./lot.data";
import { calculateLotDiagnostics } from "./lot-diagnostics";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import { listPackagesByIds, type PackageDetailRecord } from "./package.data";
import { calculatePackageDiagnostics } from "./package-diagnostics";
import {
	listShipmentIdsWithTrackingEvents,
	listShipmentsByIds,
	type ShipmentDetailRecord,
} from "./shipment.data";
import { calculateShipmentDiagnostics } from "./shipment-diagnostics";

type AdminDb = typeof db;

function buildLotDiagnostics(
	lots: LotDetailRecord[],
): Map<number, OperationalDiagnostic[]> {
	return new Map(lots.map((lot) => [lot.id, calculateLotDiagnostics(lot)]));
}

function buildPackageDiagnostics(
	packages: PackageDetailRecord[],
): Map<number, OperationalDiagnostic[]> {
	return new Map(
		packages.map((pkg) => [pkg.id, calculatePackageDiagnostics(pkg)]),
	);
}

function buildShipmentDiagnostics(
	shipments: ShipmentDetailRecord[],
	shipmentIdsWithEvents: Set<number>,
): Map<number, OperationalDiagnostic[]> {
	return new Map(
		shipments.map((shipment) => [
			shipment.id,
			calculateShipmentDiagnostics(
				shipment,
				shipmentIdsWithEvents.has(shipment.id),
			),
		]),
	);
}

export async function getCartTraceability(
	cartId: number,
	database: AdminDb,
): Promise<CartTraceabilityDetail> {
	const record = await getCartTraceabilityRecord(database, cartId);
	if (!record) throwNotFound("Carrito");

	const { lotIds, packageIds, shipmentIds } = collectLineageEntityIds(record);

	const [lots, packages, shipments, shipmentIdsWithEvents, cartTimeline] =
		await Promise.all([
			listLotsByIds(database, lotIds),
			listPackagesByIds(database, packageIds),
			listShipmentsByIds(database, shipmentIds),
			listShipmentIdsWithTrackingEvents(database, shipmentIds),
			TrackingEventService.getAdminCartTimeline(cartId),
		]);

	const diagnostics: CartTraceabilityDiagnosticsMaps = {
		lot: buildLotDiagnostics(lots),
		package: buildPackageDiagnostics(packages),
		shipment: buildShipmentDiagnostics(shipments, shipmentIdsWithEvents),
	};

	return cartTraceabilityDetailSchema.parse(
		assembleCartTraceability(record, diagnostics, {
			cart: cartTimeline,
			byItemId: groupTimelineByCartItem(cartTimeline),
		}),
	);
}
