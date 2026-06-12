import {
	shipmentDetailSchema,
	shipmentListOutputSchema,
	shipmentStatsSchema,
	type shipmentStatusSchema,
	type shipmentTypeSchema,
} from "~/schemas/admin/shipment.schemas";
import type { db } from "~/server/db";
import type {
	ShipmentDetail,
	ShipmentListInput,
	ShipmentListItem,
	ShipmentStats,
} from "~/shared/common/admin-crud/shipment.types";
import { trackingEventLabelMap } from "~/shared/common/tracking-display";
import { throwNotFound } from "./_base/admin-crud.errors";
import {
	diagnosticMessages,
	highestSeverity,
	matchesDiagnosticState,
	paginate,
	sumDecimals,
} from "./operational-diagnostics.types";
import {
	findShipmentById,
	listLatestShipmentTrackingEvents,
	listShipmentCandidates,
	type ShipmentDetailRecord,
	type ShipmentTrackingEventRecord,
} from "./shipment.data";
import { calculateShipmentDiagnostics } from "./shipment-diagnostics";

type AdminDb = typeof db;
type ShipmentStatus = typeof shipmentStatusSchema._output;
type ShipmentType = typeof shipmentTypeSchema._output;

const shipmentStatuses: ShipmentStatus[] = [
	"pending",
	"preparing",
	"readyForDispatch",
	"inTransit",
	"received",
	"delayed",
	"failed",
	"cancelled",
];
const shipmentTypes: ShipmentType[] = ["internalTransfer", "endUserDelivery"];

function toTrackingEventSummary(event: ShipmentTrackingEventRecord) {
	return {
		id: event.id,
		eventType: event.eventType,
		label: trackingEventLabelMap[event.eventType],
		source: event.source,
		cartItemId: event.cartItemId,
		cartItemCode: event.cartItem.code,
		quantity: event.quantity?.toString() ?? null,
		createdAt: event.createdAt.toISOString(),
	};
}

function packageLineQuantity(record: ShipmentDetailRecord) {
	return sumDecimals(
		record.packages.flatMap((pkg) =>
			pkg.packageLotItems.map((line) => line.quantity),
		),
	);
}

function packageAllocationQuantity(record: ShipmentDetailRecord) {
	return sumDecimals(
		record.packages.flatMap((pkg) =>
			pkg.packageLotItems.flatMap((line) =>
				line.packageAllocations.map((allocation) => allocation.quantity),
			),
		),
	);
}

function summarizeShipment(
	record: ShipmentDetailRecord,
	hasTrackingEvents: boolean,
): ShipmentListItem & {
	diagnostics: ReturnType<typeof calculateShipmentDiagnostics>;
} {
	const diagnostics = calculateShipmentDiagnostics(record, hasTrackingEvents);

	return {
		id: record.id,
		internalCode: record.internalCode,
		name: record.name,
		type: record.type,
		status: record.status,
		trackingCode: record.trackingCode,
		carrierOrder: record.carrierOrder,
		packageCount: record.packages.length,
		transportedQuantity: packageLineQuantity(record).toString(),
		packagedAllocationQuantity: packageAllocationQuantity(record).toString(),
		diagnosticCount: diagnostics.length,
		highestDiagnosticSeverity: highestSeverity(diagnostics),
		diagnosticMessages: diagnosticMessages(diagnostics),
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		diagnostics,
	};
}

async function toDetail(
	record: ShipmentDetailRecord,
	database: AdminDb,
): Promise<ShipmentDetail> {
	const trackingEvents = await listLatestShipmentTrackingEvents(
		database,
		record.id,
	);
	const summary = summarizeShipment(record, trackingEvents.length > 0);

	return shipmentDetailSchema.parse({
		...summary,
		destinationAddressSnapshot: record.destinationAddressSnapshot,
		destinationContactSnapshot: record.destinationContactSnapshot,
		packages: record.packages.map((pkg) => {
			const lineQuantity = sumDecimals(
				pkg.packageLotItems.map((line) => line.quantity),
			);
			const allocationQuantity = sumDecimals(
				pkg.packageLotItems.flatMap((line) =>
					line.packageAllocations.map((allocation) => allocation.quantity),
				),
			);

			return {
				id: pkg.id,
				name: pkg.name,
				trackingCode: pkg.trackingCode,
				status: pkg.status,
				lineCount: pkg.packageLotItems.length,
				lineQuantity: lineQuantity.toString(),
				allocationQuantity: allocationQuantity.toString(),
				lines: pkg.packageLotItems.map((line) => ({
					id: line.id,
					status: line.status,
					quantity: line.quantity.toString(),
					lotItemId: line.lotItemId,
					lotItemCode: line.lotItem.code,
					productName: line.lotItem.productSupplierTerms.product.name,
					allocations: line.packageAllocations.map((allocation) => ({
						id: allocation.id,
						quantity: allocation.quantity.toString(),
						cartItemId: allocation.cartItemLotItem.cartItem.id,
						cartItemCode: allocation.cartItemLotItem.cartItem.code,
						userName: allocation.cartItemLotItem.cartItem.cart.user.name,
					})),
				})),
			};
		}),
		trackingEvents: trackingEvents.map(toTrackingEventSummary),
	});
}

export async function list(input: ShipmentListInput, database: AdminDb) {
	const records = await listShipmentCandidates(database, input);
	const summarized = records
		.map((record) => summarizeShipment(record, false))
		.filter((item) =>
			matchesDiagnosticState(item.diagnosticCount, input.diagnosticState),
		)
		.map(({ diagnostics: _diagnostics, ...item }) => item);

	return shipmentListOutputSchema.parse(paginate(summarized, input));
}

export async function getById(id: number, database: AdminDb) {
	const record = await findShipmentById(database, id);
	if (!record) throwNotFound("Envio");
	return toDetail(record, database);
}

export async function getStats(database: AdminDb): Promise<ShipmentStats> {
	const records = await listShipmentCandidates(database, {
		page: 1,
		pageSize: 100,
		search: undefined,
		trackingCode: undefined,
		diagnosticState: "all",
	});
	const summaries = records.map((record) => summarizeShipment(record, false));
	const byStatus = Object.fromEntries(
		shipmentStatuses.map((status) => [
			status,
			summaries.filter((summary) => summary.status === status).length,
		]),
	) as Record<ShipmentStatus, number>;
	const byType = Object.fromEntries(
		shipmentTypes.map((type) => [
			type,
			summaries.filter((summary) => summary.type === type).length,
		]),
	) as Record<ShipmentType, number>;

	return shipmentStatsSchema.parse({
		total: summaries.length,
		byStatus,
		byType,
		packageCount: records.reduce(
			(count, record) => count + record.packages.length,
			0,
		),
		transportedQuantity: sumDecimals(
			records.map(packageLineQuantity),
		).toString(),
		withDiagnostics: summaries.filter((summary) => summary.diagnosticCount > 0)
			.length,
	});
}
