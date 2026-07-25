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
	DIAGNOSTIC_SCAN_LIMIT,
	decimal,
	diagnosticMessages,
	highestSeverity,
	resolveDiagnosticListPage,
	sumDecimals,
} from "./operational-diagnostics.types";
import {
	countShipmentCandidates,
	findShipmentById,
	getShipmentStats,
	listLatestShipmentTrackingEvents,
	listShipmentCandidates,
	type ShipmentDetailRecord,
	type ShipmentSummaryRecord,
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

function packageLineQuantity(record: ShipmentSummaryRecord) {
	return sumDecimals(
		record.packages.flatMap((pkg) =>
			pkg.packageLotItems.map((line) => line.quantity),
		),
	);
}

function packageAllocationQuantity(record: ShipmentSummaryRecord) {
	return sumDecimals(
		record.packages.flatMap((pkg) =>
			pkg.packageLotItems.flatMap((line) =>
				line.packageAllocations.map((allocation) => allocation.quantity),
			),
		),
	);
}

function summarizeShipment(
	record: ShipmentSummaryRecord,
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
	if (input.diagnosticState === "all") {
		const [total, records] = await Promise.all([
			countShipmentCandidates(database, input),
			listShipmentCandidates(database, input, {
				skip: (input.page - 1) * input.pageSize,
				take: input.pageSize,
			}),
		]);
		const items = records
			.map((record) => summarizeShipment(record, false))
			.map(({ diagnostics: _diagnostics, ...item }) => item);

		return shipmentListOutputSchema.parse({
			items,
			page: input.page,
			pageSize: input.pageSize,
			total,
			pageCount: total === 0 ? 0 : Math.ceil(total / input.pageSize),
			truncated: false,
		});
	}

	const records = await listShipmentCandidates(database, input, {
		take: DIAGNOSTIC_SCAN_LIMIT,
	});
	const summarized = records
		.map((record) => summarizeShipment(record, false))
		.map(({ diagnostics: _diagnostics, ...item }) => item);

	return shipmentListOutputSchema.parse(
		resolveDiagnosticListPage(summarized, input, records.length),
	);
}

export async function getById(id: number, database: AdminDb) {
	const record = await findShipmentById(database, id);
	if (!record) throwNotFound("Envio");
	return toDetail(record, database);
}

export async function getStats(database: AdminDb): Promise<ShipmentStats> {
	const [stats, scanRecords] = await Promise.all([
		getShipmentStats(database),
		listShipmentCandidates(
			database,
			{
				page: 1,
				pageSize: DIAGNOSTIC_SCAN_LIMIT,
				sortDirection: "desc",
				search: undefined,
				trackingCode: undefined,
				diagnosticState: "all",
			},
			{ take: DIAGNOSTIC_SCAN_LIMIT },
		),
	]);

	const byStatusCounts = new Map(
		stats.byStatus.map((row) => [row.status, row._count._all]),
	);
	const byStatus = Object.fromEntries(
		shipmentStatuses.map((status) => [status, byStatusCounts.get(status) ?? 0]),
	) as Record<ShipmentStatus, number>;

	const byTypeCounts = new Map(
		stats.byType.map((row) => [row.type, row._count._all]),
	);
	const byType = Object.fromEntries(
		shipmentTypes.map((type) => [type, byTypeCounts.get(type) ?? 0]),
	) as Record<ShipmentType, number>;

	const withDiagnostics = scanRecords
		.map((record) => summarizeShipment(record, false))
		.filter((summary) => summary.diagnosticCount > 0).length;

	return shipmentStatsSchema.parse({
		total: stats.total,
		byStatus,
		byType,
		packageCount: stats.packageCount,
		transportedQuantity: decimal(stats.transportedQuantity).toString(),
		withDiagnostics,
		truncated: scanRecords.length >= DIAGNOSTIC_SCAN_LIMIT,
	});
}
