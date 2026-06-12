import {
	packageDetailSchema,
	packageListOutputSchema,
	packageStatsSchema,
	type packageStatusSchema,
} from "~/schemas/admin/package.schemas";
import type { db } from "~/server/db";
import type {
	PackageDetail,
	PackageListInput,
	PackageListItem,
	PackageStats,
} from "~/shared/common/admin-crud/package.types";
import { trackingEventLabelMap } from "~/shared/common/tracking-display";
import { throwNotFound } from "./_base/admin-crud.errors";
import {
	decimal,
	diagnosticMessages,
	highestSeverity,
	matchesDiagnosticState,
	paginate,
	sumDecimals,
} from "./operational-diagnostics.types";
import {
	findPackageById,
	listLatestPackageTrackingEvents,
	listPackageCandidates,
	type PackageDetailRecord,
	type PackageTrackingEventRecord,
} from "./package.data";
import { calculatePackageDiagnostics } from "./package-diagnostics";

type AdminDb = typeof db;
type PackageStatus = typeof packageStatusSchema._output;

const packageStatuses: PackageStatus[] = [
	"pending",
	"packing",
	"readyForShipment",
	"inTransit",
	"received",
	"delayed",
	"failed",
	"cancelled",
];

function toTrackingEventSummary(event: PackageTrackingEventRecord) {
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

function summarizePackage(record: PackageDetailRecord): PackageListItem & {
	diagnostics: ReturnType<typeof calculatePackageDiagnostics>;
} {
	const diagnostics = calculatePackageDiagnostics(record);
	const packageLineQuantity = sumDecimals(
		record.packageLotItems.map((line) => line.quantity),
	);
	const packagedAllocationQuantity = sumDecimals(
		record.packageLotItems.flatMap((line) =>
			line.packageAllocations.map((allocation) => allocation.quantity),
		),
	);

	return {
		id: record.id,
		name: record.name,
		trackingCode: record.trackingCode,
		status: record.status,
		shipment: record.shipment,
		packageLineCount: record.packageLotItems.length,
		packageLineQuantity: packageLineQuantity.toString(),
		packagedAllocationQuantity: packagedAllocationQuantity.toString(),
		unallocatedQuantity: decimal(packageLineQuantity)
			.minus(packagedAllocationQuantity)
			.toString(),
		diagnosticCount: diagnostics.length,
		highestDiagnosticSeverity: highestSeverity(diagnostics),
		diagnosticMessages: diagnosticMessages(diagnostics),
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		diagnostics,
	};
}

async function toDetail(
	record: PackageDetailRecord,
	database: AdminDb,
): Promise<PackageDetail> {
	const summary = summarizePackage(record);
	const trackingEvents = await listLatestPackageTrackingEvents(
		database,
		record.id,
	);

	return packageDetailSchema.parse({
		...summary,
		packageLines: record.packageLotItems.map((line) => {
			const allocationQuantity = sumDecimals(
				line.packageAllocations.map((allocation) => allocation.quantity),
			);

			return {
				id: line.id,
				quantity: line.quantity.toString(),
				status: line.status,
				allocationQuantity: allocationQuantity.toString(),
				unallocatedQuantity: decimal(line.quantity)
					.minus(allocationQuantity)
					.toString(),
				lotItem: {
					id: line.lotItem.id,
					code: line.lotItem.code,
					status: line.lotItem.status,
					quantity: line.lotItem.quantity.toString(),
					lot: {
						id: line.lotItem.lot.id,
						code: line.lotItem.lot.code,
						supplierName: line.lotItem.lot.supplier.name,
					},
					product: line.lotItem.productSupplierTerms.product,
				},
				packageAllocations: line.packageAllocations.map((allocation) => ({
					id: allocation.id,
					quantity: allocation.quantity.toString(),
					demandAllocation: {
						id: allocation.cartItemLotItem.id,
						quantity: allocation.cartItemLotItem.quantity.toString(),
						lotItemId: allocation.cartItemLotItem.lotItemId,
						cartItem: {
							...allocation.cartItemLotItem.cartItem,
							quantity: allocation.cartItemLotItem.cartItem.quantity.toString(),
						},
					},
				})),
			};
		}),
		trackingEvents: trackingEvents.map(toTrackingEventSummary),
	});
}

export async function list(input: PackageListInput, database: AdminDb) {
	const records = await listPackageCandidates(database, input);
	const summarized = records
		.map(summarizePackage)
		.filter((item) =>
			matchesDiagnosticState(item.diagnosticCount, input.diagnosticState),
		)
		.map(({ diagnostics: _diagnostics, ...item }) => item);

	return packageListOutputSchema.parse(paginate(summarized, input));
}

export async function getById(id: number, database: AdminDb) {
	const record = await findPackageById(database, id);
	if (!record) throwNotFound("Paquete");
	return toDetail(record, database);
}

export async function getStats(database: AdminDb): Promise<PackageStats> {
	const records = await listPackageCandidates(database, {
		page: 1,
		pageSize: 100,
		search: undefined,
		diagnosticState: "all",
	});
	const summaries = records.map(summarizePackage);
	const byStatus = Object.fromEntries(
		packageStatuses.map((status) => [
			status,
			summaries.filter((summary) => summary.status === status).length,
		]),
	) as Record<PackageStatus, number>;
	const packageLineQuantity = sumDecimals(
		records.flatMap((record) =>
			record.packageLotItems.map((line) => line.quantity),
		),
	);
	const packagedAllocationQuantity = sumDecimals(
		records.flatMap((record) =>
			record.packageLotItems.flatMap((line) =>
				line.packageAllocations.map((allocation) => allocation.quantity),
			),
		),
	);

	return packageStatsSchema.parse({
		total: summaries.length,
		byStatus,
		packageLineQuantity: packageLineQuantity.toString(),
		packagedAllocationQuantity: packagedAllocationQuantity.toString(),
		unallocatedQuantity: decimal(packageLineQuantity)
			.minus(packagedAllocationQuantity)
			.toString(),
		withDiagnostics: summaries.filter((summary) => summary.diagnosticCount > 0)
			.length,
	});
}
