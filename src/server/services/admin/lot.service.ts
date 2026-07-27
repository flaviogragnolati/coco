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
import { lotAvailableActions } from "~/shared/common/fulfillment-transitions";
import { trackingEventLabelMap } from "~/shared/common/tracking-display";
import { throwNotFound } from "./_base/admin-crud.errors";
import {
	countLotCandidates,
	findLotById,
	getLotStats,
	type LotDetailRecord,
	type LotSummaryRecord,
	type LotTrackingEventRecord,
	listLatestLotTrackingEvents,
	listLotCandidates,
} from "./lot.data";
import { calculateLotDiagnostics } from "./lot-diagnostics";
import {
	DIAGNOSTIC_SCAN_LIMIT,
	decimal,
	diagnosticMessages,
	highestSeverity,
	resolveDiagnosticListPage,
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

function summarizeLot(record: LotSummaryRecord): LotListItem & {
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
		availableActions: lotAvailableActions({
			supplierOrderCode: record.supplierOrder?.code ?? null,
		}),
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
	if (input.diagnosticState === "all") {
		const [total, records] = await Promise.all([
			countLotCandidates(database, input),
			listLotCandidates(database, input, {
				skip: (input.page - 1) * input.pageSize,
				take: input.pageSize,
			}),
		]);
		const items = records
			.map(summarizeLot)
			.map(({ diagnostics: _diagnostics, ...item }) => item);

		return lotListOutputSchema.parse({
			items,
			page: input.page,
			pageSize: input.pageSize,
			total,
			pageCount: total === 0 ? 0 : Math.ceil(total / input.pageSize),
			truncated: false,
		});
	}

	const records = await listLotCandidates(database, input, {
		take: DIAGNOSTIC_SCAN_LIMIT,
	});
	const summarized = records
		.map(summarizeLot)
		.map(({ diagnostics: _diagnostics, ...item }) => item);

	return lotListOutputSchema.parse(
		resolveDiagnosticListPage(summarized, input, records.length),
	);
}

export async function getById(id: number, database: AdminDb) {
	const record = await findLotById(database, id);
	if (!record) throwNotFound("Lote");
	return toDetail(record, database);
}

export async function getStats(database: AdminDb): Promise<LotStats> {
	const [stats, scanRecords] = await Promise.all([
		getLotStats(database),
		listLotCandidates(
			database,
			{
				page: 1,
				pageSize: DIAGNOSTIC_SCAN_LIMIT,
				sortDirection: "desc",
				search: undefined,
				diagnosticState: "all",
			},
			{ take: DIAGNOSTIC_SCAN_LIMIT },
		),
	]);

	const byStatusCounts = new Map(
		stats.byStatus.map((row) => [row.status, row._count._all]),
	);
	const byStatus = Object.fromEntries(
		lotStatuses.map((status) => [status, byStatusCounts.get(status) ?? 0]),
	) as Record<LotStatus, number>;

	const demandAllocationQuantity = decimal(stats.demandAllocationQuantity);
	const withDiagnostics = scanRecords
		.map(summarizeLot)
		.filter((summary) => summary.diagnosticCount > 0).length;

	return lotStatsSchema.parse({
		total: stats.total,
		byStatus,
		lotItemQuantity: decimal(stats.lotItemQuantity).toString(),
		demandAllocationQuantity: demandAllocationQuantity.toString(),
		pendingPackageQuantity: demandAllocationQuantity
			.minus(decimal(stats.packagedQuantity))
			.toString(),
		withDiagnostics,
		truncated: scanRecords.length >= DIAGNOSTIC_SCAN_LIMIT,
	});
}
