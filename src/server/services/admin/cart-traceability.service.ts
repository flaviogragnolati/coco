import { cartTraceabilityDetailSchema } from "~/schemas/admin/cart-traceability.schemas";
import type { db } from "~/server/db";
import { TrackingEventService } from "~/server/services/tracking/tracking-event.service";
import type { CartTraceabilityDetail } from "~/shared/common/cart-traceability.types";
import { throwNotFound } from "./_base/admin-crud.errors";
import {
	assembleCartTraceability,
	type CartTraceabilityDiagnosticsMaps,
} from "./cart-traceability.assembler";
import {
	collectLineageEntityIds,
	getCartTraceabilityRecord,
} from "./cart-traceability.data";
import { findLotById } from "./lot.data";
import { calculateLotDiagnostics } from "./lot-diagnostics";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import { findPackageById } from "./package.data";
import { calculatePackageDiagnostics } from "./package-diagnostics";
import {
	findShipmentById,
	listLatestShipmentTrackingEvents,
} from "./shipment.data";
import { calculateShipmentDiagnostics } from "./shipment-diagnostics";

type AdminDb = typeof db;

async function buildLotDiagnostics(database: AdminDb, lotIds: number[]) {
	const entries = await Promise.all(
		lotIds.map(async (id) => {
			const record = await findLotById(database, id);
			return [id, record ? calculateLotDiagnostics(record) : []] as const;
		}),
	);

	return new Map<number, OperationalDiagnostic[]>(entries);
}

async function buildPackageDiagnostics(
	database: AdminDb,
	packageIds: number[],
) {
	const entries = await Promise.all(
		packageIds.map(async (id) => {
			const record = await findPackageById(database, id);
			return [id, record ? calculatePackageDiagnostics(record) : []] as const;
		}),
	);

	return new Map<number, OperationalDiagnostic[]>(entries);
}

async function buildShipmentDiagnostics(
	database: AdminDb,
	shipmentIds: number[],
) {
	const entries = await Promise.all(
		shipmentIds.map(async (id) => {
			const record = await findShipmentById(database, id);
			if (!record) {
				return [id, [] as OperationalDiagnostic[]] as const;
			}

			const trackingEvents = await listLatestShipmentTrackingEvents(
				database,
				id,
			);
			return [
				id,
				calculateShipmentDiagnostics(record, trackingEvents.length > 0),
			] as const;
		}),
	);

	return new Map<number, OperationalDiagnostic[]>(entries);
}

export async function getCartTraceability(
	cartId: number,
	database: AdminDb,
): Promise<CartTraceabilityDetail> {
	const record = await getCartTraceabilityRecord(database, cartId);
	if (!record) throwNotFound("Carrito");

	const { lotIds, packageIds, shipmentIds } = collectLineageEntityIds(record);

	const [lot, pkg, shipment, cartTimeline, itemTimelineEntries] =
		await Promise.all([
			buildLotDiagnostics(database, lotIds),
			buildPackageDiagnostics(database, packageIds),
			buildShipmentDiagnostics(database, shipmentIds),
			TrackingEventService.getAdminCartTimeline(cartId),
			Promise.all(
				record.cartItems.map(
					async (item) =>
						[
							item.id,
							await TrackingEventService.getAdminCartItemTimeline(item.id),
						] as const,
				),
			),
		]);

	const diagnostics: CartTraceabilityDiagnosticsMaps = {
		lot,
		package: pkg,
		shipment,
	};

	return cartTraceabilityDetailSchema.parse(
		assembleCartTraceability(record, diagnostics, {
			cart: cartTimeline,
			byItemId: new Map(itemTimelineEntries),
		}),
	);
}
