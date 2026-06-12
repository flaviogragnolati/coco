import {
	lotDetailSchema,
	lotListOutputSchema,
	lotStatsSchema,
	type lotStatusSchema,
} from "~/schemas/admin/lot.schemas";
import type { db } from "~/server/db";
import type {
	LotDetail,
	LotListInput,
	LotListItem,
	LotStats,
} from "~/shared/common/admin-crud/lot.types";
import { trackingEventLabelMap } from "~/shared/common/tracking-display";
import { throwNotFound } from "./_base/admin-crud.errors";
import {
	findLotById,
	type LotDetailRecord,
	type LotTrackingEventRecord,
	listLatestLotTrackingEvents,
	listLotCandidates,
} from "./lot.data";
import { calculateLotDiagnostics } from "./lot-diagnostics";
import {
	decimal,
	diagnosticMessages,
	highestSeverity,
	matchesDiagnosticState,
	paginate,
	sumDecimals,
} from "./operational-diagnostics.types";

type AdminDb = typeof db;
type LotStatus = typeof lotStatusSchema._output;

const lotStatuses: LotStatus[] = [
	"pending",
	"assembling",
	"requested",
	"confirmed",
	"readyForPackaging",
	"completed",
	"cancelled",
];

function toTrackingEventSummary(event: LotTrackingEventRecord) {
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

function summarizeLot(record: LotDetailRecord): LotListItem & {
	diagnostics: ReturnType<typeof calculateLotDiagnostics>;
} {
	const diagnostics = calculateLotDiagnostics(record);
	const lotItemQuantity = sumDecimals(
		record.lotItems.map((item) => item.quantity),
	);
	const demandAllocationQuantity = sumDecimals(
		record.lotItems.flatMap((item) =>
			item.cartItemLotItems.map((allocation) => allocation.quantity),
		),
	);
	const packagedQuantity = sumDecimals(
		record.lotItems.flatMap((item) =>
			item.cartItemLotItems.flatMap((allocation) =>
				allocation.packageAllocations.map(
					(packageAllocation) => packageAllocation.quantity,
				),
			),
		),
	);
	const pendingQuantity = decimal(demandAllocationQuantity).minus(
		packagedQuantity,
	);

	return {
		id: record.id,
		code: record.code,
		status: record.status,
		operation: {
			id: record.operation.id,
			code: record.operation.code,
			status: record.operation.status,
		},
		supplier: record.supplier,
		supplierOrder: record.supplierOrder,
		lotItemCount: record.lotItems.length,
		lotItemQuantity: lotItemQuantity.toString(),
		demandAllocationQuantity: demandAllocationQuantity.toString(),
		packagedQuantity: packagedQuantity.toString(),
		pendingQuantity: pendingQuantity.toString(),
		diagnosticCount: diagnostics.length,
		highestDiagnosticSeverity: highestSeverity(diagnostics),
		diagnosticMessages: diagnosticMessages(diagnostics),
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		diagnostics,
	};
}

async function toDetail(
	record: LotDetailRecord,
	database: AdminDb,
): Promise<LotDetail> {
	const summary = summarizeLot(record);
	const trackingEvents = await listLatestLotTrackingEvents(database, {
		lotId: record.id,
		lotItemIds: record.lotItems.map((item) => item.id),
	});

	return lotDetailSchema.parse({
		...summary,
		lotItems: record.lotItems.map((item) => {
			const demandAllocationQuantity = sumDecimals(
				item.cartItemLotItems.map((allocation) => allocation.quantity),
			);
			const packagedQuantity = sumDecimals(
				item.cartItemLotItems.flatMap((allocation) =>
					allocation.packageAllocations.map(
						(packageAllocation) => packageAllocation.quantity,
					),
				),
			);

			return {
				id: item.id,
				code: item.code,
				status: item.status,
				quantity: item.quantity.toString(),
				demandAllocationQuantity: demandAllocationQuantity.toString(),
				packagedQuantity: packagedQuantity.toString(),
				pendingQuantity: decimal(demandAllocationQuantity)
					.minus(packagedQuantity)
					.toString(),
				destination: item.destination,
				product: item.productSupplierTerms.product,
				demandAllocations: item.cartItemLotItems.map((allocation) => ({
					id: allocation.id,
					quantity: allocation.quantity.toString(),
					cartItem: {
						...allocation.cartItem,
						quantity: allocation.cartItem.quantity.toString(),
					},
					packagedQuantity: sumDecimals(
						allocation.packageAllocations.map(
							(packageAllocation) => packageAllocation.quantity,
						),
					).toString(),
				})),
			};
		}),
		rollOvers: record.operation.rollOvers.map((rollOver) => ({
			id: rollOver.id,
			stage: rollOver.stage,
			status: rollOver.status,
			quantity: rollOver.quantity.toString(),
			reason: rollOver.reason,
			cartItemId: rollOver.cartItemId,
			cartItemCode: rollOver.cartItem.code,
		})),
		trackingEvents: trackingEvents.map(toTrackingEventSummary),
	});
}

export async function list(input: LotListInput, database: AdminDb) {
	const records = await listLotCandidates(database, input);
	const summarized = records
		.map(summarizeLot)
		.filter((item) =>
			matchesDiagnosticState(item.diagnosticCount, input.diagnosticState),
		)
		.map(({ diagnostics: _diagnostics, ...item }) => item);

	return lotListOutputSchema.parse(paginate(summarized, input));
}

export async function getById(id: number, database: AdminDb) {
	const record = await findLotById(database, id);
	if (!record) throwNotFound("Lote");
	return toDetail(record, database);
}

export async function getStats(database: AdminDb): Promise<LotStats> {
	const records = await listLotCandidates(database, {
		page: 1,
		pageSize: 100,
		search: undefined,
		diagnosticState: "all",
	});
	const summaries = records.map(summarizeLot);
	const byStatus = Object.fromEntries(
		lotStatuses.map((status) => [
			status,
			summaries.filter((summary) => summary.status === status).length,
		]),
	) as Record<LotStatus, number>;
	const lotItemQuantity = sumDecimals(
		records.flatMap((record) => record.lotItems.map((item) => item.quantity)),
	);
	const demandAllocationQuantity = sumDecimals(
		records.flatMap((record) =>
			record.lotItems.flatMap((item) =>
				item.cartItemLotItems.map((allocation) => allocation.quantity),
			),
		),
	);
	const packagedQuantity = sumDecimals(
		records.flatMap((record) =>
			record.lotItems.flatMap((item) =>
				item.cartItemLotItems.flatMap((allocation) =>
					allocation.packageAllocations.map(
						(packageAllocation) => packageAllocation.quantity,
					),
				),
			),
		),
	);

	return lotStatsSchema.parse({
		total: summaries.length,
		byStatus,
		lotItemQuantity: lotItemQuantity.toString(),
		demandAllocationQuantity: demandAllocationQuantity.toString(),
		pendingPackageQuantity: decimal(demandAllocationQuantity)
			.minus(packagedQuantity)
			.toString(),
		withDiagnostics: summaries.filter((summary) => summary.diagnosticCount > 0)
			.length,
	});
}
