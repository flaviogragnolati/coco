import { Prisma } from "~/prisma/client";
import {
	packageDetailSchema,
	packageFractionationCandidatesOutputSchema,
	type packageLegSchema,
	packageListOutputSchema,
	packageStatsSchema,
	type packageStatusSchema,
} from "~/schemas/admin/package.schemas";
import type { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { writeAdminAuditLog } from "~/server/services/admin/_base/admin-audit";
import { recomputeOperationCounters } from "~/server/services/operations/operation-counters";
import type {
	PackageConfirmDeliveryInput,
	PackageDetail,
	PackageExceptionInput,
	PackageFractionateInput,
	PackageFractionateOutput,
	PackageFractionationCandidatesInput,
	PackageFractionationCandidatesOutput,
	PackageListInput,
	PackageListItem,
	PackagePromoteInput,
	PackageRecoverInput,
	PackageSplitInput,
	PackageSplitOutput,
	PackageStats,
	PackageWriteOffInput,
} from "~/shared/common/admin-crud/package.types";
import {
	isLegalTransition,
	lotItemTransitions,
	lotTransitions,
	packageAvailableActions,
	packageRecoveryTarget,
	packageTransitions,
} from "~/shared/common/fulfillment-transitions";
import { trackingEventLabelMap } from "~/shared/common/tracking-display";
import { throwConflict, throwNotFound } from "./_base/admin-crud.errors";
import { runSerializable } from "./_base/serializable-transaction";
import {
	DIAGNOSTIC_SCAN_LIMIT,
	decimal,
	diagnosticMessages,
	highestSeverity,
	resolveDiagnosticListPage,
	sumDecimals,
} from "./operational-diagnostics.types";
import type {
	AdminOperationsEffectSummary,
	AdminPackagedLineChange,
	AdminSupplierOrderRollOverChange,
} from "./operations-effects/operations-effects.types";
import { AdminOperationsSideEffects } from "./operations-effects/operations-side-effects.service";
import {
	countPackageCandidates,
	createOutboundPackage,
	createPackageAllocations,
	createPackageLines,
	createSiblingPackage,
	type FractionationSourceRecord,
	findLotItemsForPackagingRollUp,
	findLotsForPackagingRollUp,
	findPackageById,
	findPackageForCommand,
	findPackagesForFractionation,
	fractionableQuantity,
	getPackageStats,
	listLatestPackageTrackingEvents,
	listPackageCandidates,
	type PackageCommandRecord,
	type PackageDetailRecord,
	type PackageSummaryRecord,
	type PackageTrackingEventRecord,
	packagedAllocationFractionableQuantity,
	packageFractionableQuantity,
	stalePackageThreshold,
	updatePackagedAllocationQuantity,
	updatePackageLeg,
	updatePackageLineState,
	updatePackageLineStatuses,
	updatePackageName,
	updatePackageStatuses,
} from "./package.data";
import {
	planPackagedSplit,
	type ShortfallCandidate,
} from "./package-allocation-planner";
import {
	calculatePackageDiagnostics,
	type PackageDiagnosticsOptions,
} from "./package-diagnostics";
import {
	type FractionationCandidate,
	planFractionation,
} from "./package-fractionation";
import { applyPackagedShortfall } from "./packaged-shortfall";
import {
	createPostAllocationRollOvers,
	type PostAllocationRollOverInput,
} from "./roll-over.data";
import {
	resolveAllocationOrderItemCreatedAt,
	resolveAllocationPaidAt,
	updateLotItemStatuses,
	updateLotStatuses,
} from "./supplier-order.data";

type AdminDb = typeof db;
type PackageStatus = typeof packageStatusSchema._output;
type PackageLeg = typeof packageLegSchema._output;

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
const packageLegs: PackageLeg[] = ["inbound", "outbound"];

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

function summarizePackage(
	record: PackageSummaryRecord,
	options?: PackageDiagnosticsOptions,
): PackageListItem & {
	diagnostics: ReturnType<typeof calculatePackageDiagnostics>;
} {
	const diagnostics = calculatePackageDiagnostics(record, options);
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
		leg: record.leg,
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

	const liveLines = record.packageLotItems.filter(
		(line) => line.status !== "cancelled",
	);
	// Derived, never stored: the customer of an outbound package is whoever its
	// allocations belong to (§2, "no `Package.cartId` column").
	const distinctCartIds = new Set(
		liveLines.flatMap((line) =>
			line.packageAllocations.map(
				(allocation) => allocation.cartItemLotItem.cartItem.cart.id,
			),
		),
	);
	const fractionable = packageFractionableQuantity(liveLines);

	return packageDetailSchema.parse({
		...summary,
		fractionableQuantity: fractionable.toString(),
		distinctCartCount: distinctCartIds.size,
		recoveryTarget:
			record.status === "delayed"
				? packageRecoveryTarget({
						shipmentStatus: record.shipment?.status ?? null,
					})
				: null,
		availableActions: packageAvailableActions({
			status: record.status,
			leg: record.leg,
			shipmentStatus: record.shipment?.status ?? null,
			liveLineCount: liveLines.length,
			liveLineQuantity: sumDecimals(
				liveLines.map((line) => line.quantity),
			).toString(),
			fractionableQuantity: fractionable.toString(),
			distinctCartCount: distinctCartIds.size,
		}),
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
					fractionableQuantity:
						packagedAllocationFractionableQuantity(allocation).toString(),
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
	const diagnosticOptions: PackageDiagnosticsOptions = {
		staleBefore: stalePackageThreshold(),
	};

	if (input.diagnosticState === "all") {
		const [total, records] = await Promise.all([
			countPackageCandidates(database, input),
			listPackageCandidates(database, input, {
				skip: (input.page - 1) * input.pageSize,
				take: input.pageSize,
			}),
		]);
		const items = records
			.map((record) => summarizePackage(record, diagnosticOptions))
			.map(({ diagnostics: _diagnostics, ...item }) => item);

		return packageListOutputSchema.parse({
			items,
			page: input.page,
			pageSize: input.pageSize,
			total,
			pageCount: total === 0 ? 0 : Math.ceil(total / input.pageSize),
			truncated: false,
		});
	}

	const records = await listPackageCandidates(database, input, {
		take: DIAGNOSTIC_SCAN_LIMIT,
	});
	const summarized = records
		.map((record) => summarizePackage(record, diagnosticOptions))
		.map(({ diagnostics: _diagnostics, ...item }) => item);

	return packageListOutputSchema.parse(
		resolveDiagnosticListPage(summarized, input, records.length),
	);
}

export async function getById(id: number, database: AdminDb) {
	const record = await findPackageById(database, id);
	if (!record) throwNotFound("Paquete");
	return toDetail(record, database);
}

export async function getStats(database: AdminDb): Promise<PackageStats> {
	const diagnosticOptions: PackageDiagnosticsOptions = {
		staleBefore: stalePackageThreshold(),
	};
	const [stats, scanRecords] = await Promise.all([
		getPackageStats(database),
		listPackageCandidates(
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
		packageStatuses.map((status) => [status, byStatusCounts.get(status) ?? 0]),
	) as Record<PackageStatus, number>;

	const byLegCounts = new Map(
		stats.byLeg.map((row) => [row.leg, row._count._all]),
	);
	const byLeg = Object.fromEntries(
		packageLegs.map((leg) => [leg, byLegCounts.get(leg) ?? 0]),
	) as Record<PackageLeg, number>;

	const packageLineQuantity = decimal(stats.packageLineQuantity);
	const withDiagnostics = scanRecords
		.map((record) => summarizePackage(record, diagnosticOptions))
		.filter((summary) => summary.diagnosticCount > 0).length;

	return packageStatsSchema.parse({
		total: stats.total,
		byStatus,
		byLeg,
		packageLineQuantity: packageLineQuantity.toString(),
		packagedAllocationQuantity: decimal(
			stats.packagedAllocationQuantity,
		).toString(),
		unallocatedQuantity: packageLineQuantity
			.minus(decimal(stats.packagedAllocationQuantity))
			.toString(),
		withDiagnostics,
		truncated: scanRecords.length >= DIAGNOSTIC_SCAN_LIMIT,
	});
}

const PACKAGE_ENTITY = "package";
const sideEffects = new AdminOperationsSideEffects();
const zero = () => new Prisma.Decimal(0);

type CommandLine = PackageCommandRecord["packageLotItems"][number];

const disruptedStatuses: ReadonlySet<string> = new Set(["delayed", "failed"]);

/** Mirrors `packageAvailableActions`'s `split` gate; the guard must not drift. */
const splittableStatuses: ReadonlySet<string> = new Set([
	"pending",
	"packing",
	"readyForShipment",
	"received",
]);

function writeOffCandidates(line: CommandLine): ShortfallCandidate[] {
	return line.packageAllocations.map((allocation) => ({
		packagedAllocationId: allocation.id,
		allocationId: allocation.cartItemLotItem.id,
		cartItemId: allocation.cartItemLotItem.cartItem.id,
		packagedQuantity: allocation.quantity,
		paidAt: resolveAllocationPaidAt(allocation.cartItemLotItem.cartItem),
		orderItemCreatedAt: resolveAllocationOrderItemCreatedAt(
			allocation.cartItemLotItem.cartItem,
		),
	}));
}

function writeOffAllocations(line: CommandLine) {
	return new Map(
		line.packageAllocations.map((allocation) => [
			allocation.cartItemLotItem.id,
			{
				quantity: allocation.cartItemLotItem.quantity,
				cartId: allocation.cartItemLotItem.cartItem.cartId,
			},
		]),
	);
}

/**
 * Writing off packaged quantity that will never arrive. The same four reductions
 * a receipt shortfall applies, on a different trigger (architecture §21.2), so a
 * write-off conserves demand exactly the same way: what leaves the package
 * re-enters the pool as a post-allocation roll over (ADR 0005).
 *
 * Reachable from a `delayed` package too, not only a `failed` one: a shipment
 * that will clearly never arrive should not need a fake `markFailed` first.
 */
export async function writeOff(
	input: PackageWriteOffInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<PackageDetail> {
	const result = await runSerializable(database, async (tx) => {
		const record = await findPackageForCommand(tx, input.id);
		if (!record) throwNotFound("Paquete");

		const lines = record.packageLotItems.filter(
			(line) => line.status !== "cancelled",
		);
		if (lines.length === 0) {
			throwConflict("El paquete no tiene lineas activas");
		}
		const shipmentStatus = record.shipment?.status;
		if (
			!disruptedStatuses.has(record.status) &&
			!(shipmentStatus !== undefined && disruptedStatuses.has(shipmentStatus))
		) {
			throwConflict("Solo se puede dar de baja un paquete demorado o fallido");
		}

		const byLineId = new Map(lines.map((line) => [line.id, line]));
		const submitted = new Map(
			input.lines.map((line) => [line.packageLotItemId, line]),
		);
		if (submitted.size !== input.lines.length) {
			throwConflict("Cada linea se puede enviar una sola vez");
		}

		const plans: Array<{
			line: CommandLine;
			quantity: Prisma.Decimal;
			overrides?: PackageWriteOffInput["lines"][number]["overrides"];
		}> = [];
		for (const declared of input.lines) {
			const line = byLineId.get(declared.packageLotItemId);
			if (!line) {
				throwConflict(
					`La linea #${declared.packageLotItemId} no pertenece a este paquete o esta cancelada`,
				);
			}

			const quantity = new Prisma.Decimal(declared.quantity);
			if (quantity.lte(zero())) continue;
			if (quantity.gt(line.quantity)) {
				throwConflict(
					`La linea #${line.id} solo tiene ${line.quantity.toString()} para dar de baja`,
				);
			}

			plans.push({ line, quantity, overrides: declared.overrides });
		}

		if (plans.length === 0) {
			throwConflict("La baja no tiene cantidad para ninguna linea");
		}

		const before = await detailOf(tx, record.id, database);
		const rollOverRows: Array<
			PostAllocationRollOverInput & { cartId: number }
		> = [];
		const writtenOffLines: AdminPackagedLineChange[] = [];

		for (const plan of plans) {
			const result = await applyPackagedShortfall(tx, {
				packageId: record.id,
				packageLotItemId: plan.line.id,
				lineQuantity: plan.line.quantity,
				shortfall: plan.quantity,
				cancelLine: plan.quantity.equals(plan.line.quantity),
				lotItemId: plan.line.lotItem.id,
				lotItemQuantity: plan.line.lotItem.quantity,
				operationId: plan.line.lotItem.lot.operationId,
				reason: `Baja de paquete ${record.name}: ${input.reason}`,
				candidates: writeOffCandidates(plan.line),
				overrides: plan.overrides?.map((override) => ({
					allocationId: override.allocationId,
					removedQuantity: new Prisma.Decimal(override.removedQuantity),
				})),
				allocations: writeOffAllocations(plan.line),
			});

			rollOverRows.push(...result.rollOverRows);
			if (result.removedLine) writtenOffLines.push(result.removedLine);
		}

		// A package with nothing live left is itself cancelled: it no longer covers
		// any demand, so leaving it `failed` would keep it on the worklist forever.
		const anyLineSurvives = lines.some((line) => {
			const plan = plans.find((entry) => entry.line.id === line.id);
			return !plan?.quantity.equals(line.quantity);
		});
		if (!anyLineSurvives) {
			await updatePackageStatuses(tx, [record.id], "cancelled");
		}

		const createdRollOvers = await persistRollOvers(tx, rollOverRows);

		for (const operationId of new Set(
			rollOverRows.map((row) => row.operationId),
		)) {
			await recomputeOperationCounters(tx, operationId);
		}

		const effects = await sideEffects.onPackageWrittenOff(
			{ db: tx, actor, source: "package" },
			{
				packageId: record.id,
				packageName: record.name,
				writtenOffLines,
				createdRollOvers,
				reason: input.reason,
			},
		);

		const after = await detailOf(tx, record.id, database);

		await writeAdminAuditLog(tx, {
			action: "package.writeOff",
			actor,
			entityType: PACKAGE_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: {
				effects,
				reason: input.reason,
				lines: plans.map((plan) => ({
					packageLotItemId: plan.line.id,
					lotItemCode: plan.line.lotItem.code,
					lineQuantity: plan.line.quantity.toString(),
					writtenOffQuantity: plan.quantity.toString(),
				})),
			},
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

async function detailOf(
	tx: Prisma.TransactionClient,
	id: number,
	database: AdminDb,
): Promise<PackageDetail> {
	const record = await findPackageById(tx, id);
	if (!record) throwNotFound("Paquete");
	return toDetail(record, database);
}

/**
 * `readyForPackaging → completed` for the lot lines a fractionation just packaged
 * out, cascading to their lots. Mirrors `closeReachableSupplierOrders`
 * (`shipment.service.ts`): private to the command that produces the fact, and
 * evaluated on a **re-read after the writes** — on the pre-write snapshot the
 * predicate would never hold, so nothing would ever close.
 *
 * Lots are never driven directly (ADR 0003); they cascade from their lines here
 * exactly as they cascade from their supplier order on receipt.
 */
async function closePackagedLotItems(
	tx: Prisma.TransactionClient,
	lotItemIds: number[],
): Promise<{ closedLotItemIds: number[]; closedLotIds: number[] }> {
	const lotItems = await findLotItemsForPackagingRollUp(tx, lotItemIds);

	const closedLotItemIds: number[] = [];
	const touchedLotIds = new Set<number>();
	for (const lotItem of lotItems) {
		if (!isLegalTransition(lotItemTransitions, lotItem.status, "completed")) {
			continue;
		}
		const fullyPackagedOut = lotItem.cartItemLotItems.every((allocation) =>
			fractionableQuantity(allocation).isZero(),
		);
		if (!fullyPackagedOut) continue;

		closedLotItemIds.push(lotItem.id);
		touchedLotIds.add(lotItem.lotId);
	}

	await updateLotItemStatuses(tx, closedLotItemIds, "completed");

	const lots = await findLotsForPackagingRollUp(tx, Array.from(touchedLotIds));
	const closedLotIds = lots
		.filter((lot) => {
			if (!isLegalTransition(lotTransitions, lot.status, "completed")) {
				return false;
			}
			const liveLines = lot.lotItems.filter(
				(lotItem) => lotItem.status !== "cancelled",
			);
			return (
				liveLines.length > 0 &&
				liveLines.every((lotItem) => lotItem.status === "completed")
			);
		})
		.map((lot) => lot.id);

	await updateLotStatuses(tx, closedLotIds, "completed");

	return { closedLotItemIds, closedLotIds };
}

/**
 * Fractionation: N received inbound packages become one outbound package per
 * customer. The sources are **never mutated** — they stay `received` as the only
 * remaining evidence that the goods arrived, which
 * `closeReachableSupplierOrders`, `packagedQuantity` and `deriveStage`'s
 * `atWarehouse` branch all read (architecture §11, ADR 0004).
 *
 * Partial and repeatable: what is taken is bounded by each demand allocation's
 * `fractionableQuantity`, so a second pass picks up exactly what the first left.
 */
/**
 * What each packaged allocation of the selection can still contribute, and the
 * customer behind it. Shared by `fractionate` and `fractionationCandidates` so
 * the dialog can never offer a total the command would refuse.
 *
 * The budget is per **demand allocation**, not per packaged allocation: two
 * selected sources can cover the same demand, and charging each of them the full
 * `fractionableQuantity` would package it twice (§21.6).
 */
function collectFractionationCandidates(sources: FractionationSourceRecord[]) {
	const budgetByAllocationId = new Map<number, Prisma.Decimal>();
	const userNameByCartId = new Map<number, string>();
	const candidates: Array<
		FractionationCandidate & {
			sourcePackageName: string;
			cartCode: string;
			userName: string;
			cartItemCode: string;
			lotItemCode: string;
			productName: string;
			unit: string;
		}
	> = [];

	for (const source of sources) {
		for (const line of source.packageLotItems) {
			if (line.status === "cancelled") continue;

			for (const packaged of line.packageAllocations) {
				const demand = packaged.cartItemLotItem;
				const budget =
					budgetByAllocationId.get(demand.id) ?? fractionableQuantity(demand);
				const available = budget.lessThan(packaged.quantity)
					? budget
					: packaged.quantity;
				budgetByAllocationId.set(demand.id, budget.minus(available));

				if (available.lte(zero())) continue;

				userNameByCartId.set(
					demand.cartItem.cartId,
					demand.cartItem.cart.user.name,
				);
				candidates.push({
					sourcePackageId: source.id,
					sourcePackageName: source.name,
					sourcePackageLotItemId: line.id,
					packagedAllocationId: packaged.id,
					allocationId: demand.id,
					cartItemId: demand.cartItem.id,
					cartItemCode: demand.cartItem.code,
					cartId: demand.cartItem.cartId,
					cartCode: demand.cartItem.cart.code,
					userName: demand.cartItem.cart.user.name,
					lotItemId: line.lotItemId,
					lotItemCode: line.lotItem.code,
					productName: line.lotItem.productSupplierTerms.product.name,
					unit: line.lotItem.productSupplierTerms.product.unit,
					availableQuantity: available,
				});
			}
		}
	}

	return { candidates, userNameByCartId };
}

/** Every id must resolve to a received inbound package, or the whole call fails. */
function assertFractionationSources(
	sourceIds: number[],
	sources: FractionationSourceRecord[],
) {
	const sourceById = new Map(sources.map((source) => [source.id, source]));

	for (const id of sourceIds) {
		const source = sourceById.get(id);
		if (!source) throwNotFound("Paquete");
		if (source.leg !== "inbound" || source.status !== "received") {
			throwConflict(
				`El paquete ${source.name} no es un paquete de entrada recibido`,
			);
		}
	}
}

/**
 * The rows the fractionate dialog edits, across a whole selection of sources.
 * A query: no actor, no transaction, no writes. It exists so the dialog reads
 * `fractionableQuantity` from the same arithmetic the command applies instead of
 * recomputing it client-side (§21.6, the dual-truth this avoids).
 */
export async function fractionationCandidates(
	input: PackageFractionationCandidatesInput,
	database: AdminDb,
): Promise<PackageFractionationCandidatesOutput> {
	const sourceIds = Array.from(new Set(input.sourcePackageIds));
	const sources = await findPackagesForFractionation(database, sourceIds);
	assertFractionationSources(sourceIds, sources);

	const { candidates } = collectFractionationCandidates(sources);

	return packageFractionationCandidatesOutputSchema.parse({
		candidates: candidates.map((candidate) => ({
			packagedAllocationId: candidate.packagedAllocationId,
			sourcePackageId: candidate.sourcePackageId,
			sourcePackageName: candidate.sourcePackageName,
			cartId: candidate.cartId,
			cartCode: candidate.cartCode,
			userName: candidate.userName,
			cartItemCode: candidate.cartItemCode,
			lotItemId: candidate.lotItemId,
			lotItemCode: candidate.lotItemCode,
			productName: candidate.productName,
			unit: candidate.unit,
			fractionableQuantity: candidate.availableQuantity.toString(),
		})),
	});
}

export async function fractionate(
	input: PackageFractionateInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<PackageFractionateOutput> {
	const result = await runSerializable(database, async (tx) => {
		const sourceIds = Array.from(new Set(input.sourcePackageIds));
		const sources = await findPackagesForFractionation(tx, sourceIds);
		assertFractionationSources(sourceIds, sources);

		const { candidates, userNameByCartId } =
			collectFractionationCandidates(sources);

		const groups = planFractionation({
			candidates,
			requested: input.allocations?.map((allocation) => ({
				packagedAllocationId: allocation.packagedAllocationId,
				quantity: new Prisma.Decimal(allocation.quantity),
			})),
		});
		if (groups.length === 0) {
			throwConflict("No hay cantidad recibida para fraccionar");
		}

		const before = await Promise.all(
			sourceIds.map((id) => detailOf(tx, id, database)),
		);

		const namePrefix = input.namePrefix ?? "Fraccionamiento";
		const createdPackageIds: number[] = [];
		const effects: AdminOperationsEffectSummary[] = [];

		for (const group of groups) {
			const userName =
				userNameByCartId.get(group.cartId) ?? `Cliente ${group.cartId}`;
			const created = await createOutboundPackage(tx, {
				name: `${namePrefix} — ${userName}`,
			});
			createdPackageIds.push(created.id);

			const createdLines = await createPackageLines(
				tx,
				group.lines.map((line) => ({
					packageId: created.id,
					lotItemId: line.lotItemId,
					quantity: line.quantity,
				})),
			);
			const lineIdByLotItemId = new Map(
				createdLines.map((line) => [line.lotItemId, line.id]),
			);

			const packagedLines: AdminPackagedLineChange[] = [];
			for (const line of group.lines) {
				const packageLotItemId = lineIdByLotItemId.get(line.lotItemId);
				if (packageLotItemId === undefined) {
					throwConflict(
						`No se pudo crear la linea de paquete para el item de lote #${line.lotItemId}`,
					);
				}

				await createPackageAllocations(
					tx,
					line.allocations.map((allocation) => ({
						packageLotItemId,
						cartItemLotItemId: allocation.allocationId,
						quantity: allocation.quantity,
					})),
				);

				packagedLines.push({
					packageId: created.id,
					packageLotItemId,
					lotItemId: line.lotItemId,
					allocations: line.allocations.map((allocation) => ({
						cartItemId: allocation.cartItemId,
						cartId: group.cartId,
						quantity: allocation.quantity.toString(),
					})),
				});
			}

			effects.push(
				...(await sideEffects.onPackageFractionated(
					{ db: tx, actor, source: "package" },
					{
						packageId: created.id,
						packageName: `${namePrefix} — ${userName}`,
						packagedLines,
					},
				)),
			);
		}

		const rollUp = await closePackagedLotItems(
			tx,
			Array.from(
				new Set(
					groups.flatMap((group) => group.lines.map((line) => line.lotItemId)),
				),
			),
		);

		const after = await Promise.all(
			sourceIds.map((id) => detailOf(tx, id, database)),
		);

		// No counter recompute: nothing moved between `assigned` and `rollOver`.
		// Fractionation packages demand that is already assigned.
		await writeAdminAuditLog(tx, {
			action: "package.fractionate",
			actor,
			entityType: PACKAGE_ENTITY,
			entityId: String(sourceIds[0] ?? 0),
			before,
			after,
			metadata: {
				effects,
				sourcePackageIds: sourceIds,
				createdPackageIds,
				groups: groups.map((group) => ({
					cartId: group.cartId,
					packageName: `${namePrefix} — ${userNameByCartId.get(group.cartId) ?? ""}`,
					quantity: sumDecimals(
						group.lines.map((line) => line.quantity),
					).toString(),
					lines: group.lines.map((line) => ({
						lotItemId: line.lotItemId,
						quantity: line.quantity.toString(),
					})),
				})),
				closedLotItemIds: rollUp.closedLotItemIds,
				closedLotIds: rollUp.closedLotIds,
			},
		});

		return { createdPackageIds, sourcePackageIds: sourceIds };
	});

	await DomainEventDispatcher.wake();
	return result;
}

/**
 * Promotion: a mono-customer inbound package *is* the customer's package, so it
 * flips onto the outbound leg instead of being copied. The status resets to
 * `readyForShipment` because its `received` recorded the **inbound** arrival —
 * keeping it would claim an arrival at the customer that has not happened.
 *
 * Publishes **no domain event**. `package.cartItem.packaged` is keyed on
 * `(packageId, packageLotItemId, cartItemId)` and `registerDispatch` already
 * published exactly those values for this row, so a re-emit would be deduped into
 * silence. The audit log is the record; this is a decision, not an omission.
 */
export async function promote(
	input: PackagePromoteInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<PackageDetail> {
	const result = await runSerializable(database, async (tx) => {
		const [record] = await findPackagesForFractionation(tx, [input.id]);
		if (!record) throwNotFound("Paquete");

		if (record.leg !== "inbound" || record.status !== "received") {
			throwConflict("Solo se puede promover un paquete de entrada recibido");
		}
		if (
			!isLegalTransition(packageTransitions, record.status, "readyForShipment")
		) {
			throwConflict("El paquete no se puede promover desde su estado actual");
		}

		const liveLines = record.packageLotItems.filter(
			(line) => line.status !== "cancelled",
		);
		const distinctCartIds = new Set(
			liveLines.flatMap((line) =>
				line.packageAllocations.map(
					(allocation) => allocation.cartItemLotItem.cartItem.cartId,
				),
			),
		);
		if (distinctCartIds.size !== 1) {
			throwConflict("Solo se puede promover un paquete de un unico cliente");
		}

		const fractionable = packageFractionableQuantity(liveLines);
		const liveLineQuantity = sumDecimals(
			liveLines.map((line) => line.quantity),
		);
		if (!fractionable.equals(liveLineQuantity) || fractionable.lte(zero())) {
			throwConflict("El paquete ya fue fraccionado parcialmente");
		}

		const before = await detailOf(tx, record.id, database);

		await updatePackageLeg(tx, record.id, "outbound");
		await updatePackageStatuses(tx, [record.id], "readyForShipment");
		if (input.name !== undefined) {
			await updatePackageName(tx, record.id, input.name);
		}

		const after = await detailOf(tx, record.id, database);

		await writeAdminAuditLog(tx, {
			action: "package.promote",
			actor,
			entityType: PACKAGE_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: {
				cartId: Array.from(distinctCartIds)[0],
				promotedQuantity: liveLineQuantity.toString(),
				// The package leaves the inbound leg, so
				// `closeReachableSupplierOrders`'s `everyPackageReceived` check stops
				// counting it. Harmless — promotion requires `received`, which only a
				// completed receipt produces — but recorded so it is not a surprise.
				leftInboundLeg: true,
			},
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

/**
 * Splitting one package into the real physical bundles. It **re-groups**, it does
 * not lose quantity: only `planPackagedSplit` is shared with the shortfall path,
 * never `applyPackagedShortfall`, which additionally reduces `CartItemLotItem`
 * and `LotItem` and would silently destroy demand here.
 */
export async function split(
	input: PackageSplitInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<PackageSplitOutput> {
	const result = await runSerializable(database, async (tx) => {
		const record = await findPackageForCommand(tx, input.id);
		if (!record) throwNotFound("Paquete");

		if (!splittableStatuses.has(record.status)) {
			throwConflict(
				"Solo se puede dividir un paquete que no esta en movimiento",
			);
		}

		const lines = record.packageLotItems.filter(
			(line) => line.status !== "cancelled",
		);
		if (lines.length === 0) {
			throwConflict("El paquete no tiene lineas activas");
		}
		const byLineId = new Map(lines.map((line) => [line.id, line]));

		// A line may travel in several targets; what it may not do is send out more
		// than it holds. So the sum is validated, not each entry.
		const movedByLineId = new Map<number, Prisma.Decimal>();
		for (const target of input.targets) {
			const seen = new Set<number>();
			for (const declared of target.lines) {
				const line = byLineId.get(declared.packageLotItemId);
				if (!line) {
					throwConflict(
						`La linea #${declared.packageLotItemId} no pertenece a este paquete o esta cancelada`,
					);
				}
				if (seen.has(declared.packageLotItemId)) {
					throwConflict(
						`El paquete ${target.name} repite la linea #${declared.packageLotItemId}`,
					);
				}
				seen.add(declared.packageLotItemId);

				const quantity = new Prisma.Decimal(declared.quantity);
				if (quantity.lte(zero())) continue;

				const moved = (movedByLineId.get(line.id) ?? zero()).plus(quantity);
				if (moved.gt(line.quantity)) {
					throwConflict(
						`La linea #${line.id} solo tiene ${line.quantity.toString()} para dividir`,
					);
				}
				movedByLineId.set(line.id, moved);
			}
		}

		if (movedByLineId.size === 0) {
			throwConflict("La division no tiene cantidad para ninguna linea");
		}

		const before = await detailOf(tx, record.id, database);

		// Every target reads the *live* remainder of each source allocation, so two
		// targets taking from one line never plan the same units twice.
		const remainingByPackagedAllocationId = new Map(
			lines.flatMap((line) =>
				line.packageAllocations.map(
					(allocation) =>
						[allocation.id, allocation.quantity] as [number, Prisma.Decimal],
				),
			),
		);

		const createdPackageIds: number[] = [];
		const auditTargets: Array<Record<string, unknown>> = [];

		for (const target of input.targets) {
			const created = await createSiblingPackage(tx, {
				name: target.name,
				leg: record.leg,
				status: record.status,
				shipmentId: record.shipment?.id ?? null,
			});
			createdPackageIds.push(created.id);

			const plans = target.lines.flatMap((declared) => {
				const line = byLineId.get(declared.packageLotItemId);
				const quantity = new Prisma.Decimal(declared.quantity);
				if (!line || quantity.lte(zero())) return [];
				return [{ line, quantity, overrides: declared.overrides }];
			});

			const createdLines = await createPackageLines(
				tx,
				plans.map((plan) => ({
					packageId: created.id,
					lotItemId: plan.line.lotItemId,
					quantity: plan.quantity,
				})),
			);
			const lineIdByLotItemId = new Map(
				createdLines.map((line) => [line.lotItemId, line.id]),
			);

			const auditLines: Array<Record<string, unknown>> = [];
			for (const plan of plans) {
				const packageLotItemId = lineIdByLotItemId.get(plan.line.lotItemId);
				if (packageLotItemId === undefined) {
					throwConflict(
						`No se pudo crear la linea de paquete para ${plan.line.lotItem.code}`,
					);
				}

				const reductions = planPackagedSplit({
					candidates: writeOffCandidates(plan.line).flatMap((candidate) => {
						const remaining =
							remainingByPackagedAllocationId.get(
								candidate.packagedAllocationId,
							) ?? zero();
						if (remaining.lte(zero())) return [];
						return [{ ...candidate, packagedQuantity: remaining }];
					}),
					movedQuantity: plan.quantity,
					overrides: plan.overrides?.map((override) => ({
						allocationId: override.allocationId,
						removedQuantity: new Prisma.Decimal(override.removedQuantity),
					})),
				});

				for (const reduction of reductions) {
					await updatePackagedAllocationQuantity(
						tx,
						reduction.packagedAllocationId,
						reduction.remainingPackagedQuantity,
					);
					remainingByPackagedAllocationId.set(
						reduction.packagedAllocationId,
						reduction.remainingPackagedQuantity,
					);
				}

				await createPackageAllocations(
					tx,
					reductions.map((reduction) => ({
						packageLotItemId,
						cartItemLotItemId: reduction.allocationId,
						quantity: reduction.removedQuantity,
					})),
				);

				auditLines.push({
					sourcePackageLotItemId: plan.line.id,
					lotItemCode: plan.line.lotItem.code,
					movedQuantity: plan.quantity.toString(),
					allocations: reductions.map((reduction) => ({
						allocationId: reduction.allocationId,
						cartItemId: reduction.cartItemId,
						quantity: reduction.removedQuantity.toString(),
					})),
				});
			}

			auditTargets.push({
				packageId: created.id,
				name: target.name,
				lines: auditLines,
			});
		}

		// Records survive and only statuses move (Phase 1): a line emptied by the
		// split keeps its quantity as history and is cancelled, never deleted.
		let liveLinesLeft = 0;
		for (const line of lines) {
			const moved = movedByLineId.get(line.id) ?? zero();
			const remaining = line.quantity.minus(moved);
			if (moved.lte(zero())) {
				liveLinesLeft += 1;
				continue;
			}

			if (remaining.lte(zero())) {
				await updatePackageLineState(tx, line.id, { status: "cancelled" });
				continue;
			}

			await updatePackageLineState(tx, line.id, { quantity: remaining });
			liveLinesLeft += 1;
		}

		// A package with nothing live left no longer covers any demand — the same
		// rule `writeOff` applies.
		if (liveLinesLeft === 0) {
			await updatePackageStatuses(tx, [record.id], "cancelled");
		}

		const after = await detailOf(tx, record.id, database);

		await writeAdminAuditLog(tx, {
			action: "package.split",
			actor,
			entityType: PACKAGE_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: {
				createdPackageIds,
				targets: auditTargets,
				sourceCancelled: liveLinesLeft === 0,
			},
		});

		return { sourcePackageId: record.id, createdPackageIds };
	});

	await DomainEventDispatcher.wake();
	return result;
}

/**
 * `markDelayed` and `markFailed` are the same command with a different target,
 * exactly as on the shipment side. They exist at package level because a single
 * lost box inside an otherwise-fine shipment should not force failing the whole
 * shipment.
 *
 * Package **line** statuses are not moved: there is no `PackageLotItemStatus` for
 * delayed or failed, and the package status alone is what `isDisrupted` reads in
 * the derivation. No quantity moves, so no counter recompute.
 */
async function markDisrupted(
	input: PackageExceptionInput,
	target: "delayed" | "failed",
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<PackageDetail> {
	const result = await database.$transaction(async (tx) => {
		const record = await findPackageForCommand(tx, input.id);
		if (!record) throwNotFound("Paquete");

		if (!isLegalTransition(packageTransitions, record.status, target)) {
			throwConflict(
				target === "delayed"
					? "Solo se puede demorar un paquete listo o en transito"
					: "Solo se puede marcar como fallido un paquete listo, en transito o demorado",
			);
		}

		const lines = record.packageLotItems.filter(
			(line) => line.status !== "cancelled",
		);
		const before = await detailOf(tx, record.id, database);

		await updatePackageStatuses(tx, [record.id], target);

		const effects = await sideEffects.onPackageDisrupted(
			{ db: tx, actor, source: "package" },
			{
				packageId: record.id,
				packageName: record.name,
				movedLines: lines.map((line) => ({
					packageId: record.id,
					packageLotItemId: line.id,
					lotItemId: line.lotItemId,
					allocations: line.packageAllocations.map((allocation) => ({
						cartItemId: allocation.cartItemLotItem.cartItem.id,
						cartId: allocation.cartItemLotItem.cartItem.cartId,
						quantity: allocation.quantity.toString(),
					})),
				})),
				reason: input.reason,
				exceptionStatus: target,
			},
		);

		const after = await detailOf(tx, record.id, database);

		await writeAdminAuditLog(tx, {
			action:
				target === "delayed" ? "package.markDelayed" : "package.markFailed",
			actor,
			entityType: PACKAGE_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: { effects, reason: input.reason },
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

export async function markDelayed(
	input: PackageExceptionInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<PackageDetail> {
	return markDisrupted(input, "delayed", actor, database);
}

export async function markFailed(
	input: PackageExceptionInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<PackageDetail> {
	return markDisrupted(input, "failed", actor, database);
}

/** The change-set shape the outbound package events read. */
function toPackageMovedLines(
	record: PackageCommandRecord,
	lines: PackageCommandRecord["packageLotItems"],
): AdminPackagedLineChange[] {
	return lines.map((line) => ({
		packageId: record.id,
		packageLotItemId: line.id,
		lotItemId: line.lotItemId,
		allocations: line.packageAllocations.map((allocation) => ({
			cartItemId: allocation.cartItemLotItem.cartItem.id,
			cartId: allocation.cartItemLotItem.cartItem.cartId,
			quantity: allocation.quantity.toString(),
		})),
	}));
}

/**
 * The per-package handover, covering all three ways goods reach a customer:
 * depot pickup (no shipment, `readyForShipment → received`), pickup-point
 * collection (`inTransit → received`) and recovery-by-delivery (`delayed →
 * received`, a rung the ladder already offered).
 *
 * It deliberately does **not** cascade to the shipment. A pickup-point shipment
 * is already `received`, and a home-delivery one got there through
 * `shipment.deliver`; writing the shipment here would let one customer's
 * collection claim the whole route arrived.
 *
 * No quantity moves, so default isolation and no counter recompute.
 */
export async function confirmDelivery(
	input: PackageConfirmDeliveryInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<PackageDetail> {
	const result = await database.$transaction(async (tx) => {
		const record = await findPackageForCommand(tx, input.id);
		if (!record) throwNotFound("Paquete");

		if (record.leg !== "outbound") {
			throwConflict("Solo se puede entregar un paquete de salida");
		}
		if (!isLegalTransition(packageTransitions, record.status, "received")) {
			throwConflict("El paquete no esta en un estado entregable");
		}

		const lines = record.packageLotItems.filter(
			(line) => line.status !== "cancelled",
		);
		if (lines.length === 0) {
			throwConflict("El paquete no tiene lineas activas");
		}

		const before = await detailOf(tx, record.id, database);

		await updatePackageStatuses(tx, [record.id], "received");
		await updatePackageLineStatuses(
			tx,
			lines.map((line) => line.id),
			"received",
		);

		const effects = await sideEffects.onDeliveryConfirmed(
			{ db: tx, actor, source: "package" },
			{
				packageId: record.id,
				packageName: record.name,
				shipmentId: record.shipment?.id,
				movedLines: toPackageMovedLines(record, lines),
				reason: input.notes,
				resolvesException: record.status === "delayed",
			},
		);

		const after = await detailOf(tx, record.id, database);

		await writeAdminAuditLog(tx, {
			action: "package.confirmDelivery",
			actor,
			entityType: PACKAGE_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: { effects, notes: input.notes },
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

/**
 * `markDisrupted`, inverted: returns a delayed package to where it was. The
 * target is derived from the record rather than asked of the operator, so the
 * dialog's stated target and the command's effect read the same rule.
 *
 * Refuses while the shipment is itself disrupted: `isDisrupted` in the derivation
 * reads both levels, so recovering only the package would leave the item at
 * `exception` and the command would look like it did nothing.
 */
export async function recover(
	input: PackageRecoverInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<PackageDetail> {
	const result = await database.$transaction(async (tx) => {
		const record = await findPackageForCommand(tx, input.id);
		if (!record) throwNotFound("Paquete");

		if (record.status !== "delayed") {
			throwConflict("Solo se puede recuperar un paquete demorado");
		}

		const target = packageRecoveryTarget({
			shipmentStatus: record.shipment?.status ?? null,
		});
		if (target === null) {
			throwConflict("Primero hay que recuperar el envio");
		}

		const lines = record.packageLotItems.filter(
			(line) => line.status !== "cancelled",
		);
		const before = await detailOf(tx, record.id, database);

		await updatePackageStatuses(tx, [record.id], target);
		await updatePackageLineStatuses(
			tx,
			lines.map((line) => line.id),
			target === "readyForShipment" ? "packed" : "shipped",
		);

		const effects = await sideEffects.onPackageRecovered(
			{ db: tx, actor, source: "package" },
			{
				packageId: record.id,
				packageName: record.name,
				shipmentId: record.shipment?.id,
				movedLines: toPackageMovedLines(record, lines),
				reason: input.notes,
			},
		);

		const after = await detailOf(tx, record.id, database);

		await writeAdminAuditLog(tx, {
			action: "package.recover",
			actor,
			entityType: PACKAGE_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: { effects, recoveryTarget: target, notes: input.notes },
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

async function persistRollOvers(
	tx: Prisma.TransactionClient,
	rows: Array<PostAllocationRollOverInput & { cartId: number }>,
): Promise<AdminSupplierOrderRollOverChange[]> {
	const created = await createPostAllocationRollOvers(tx, rows);

	return created.map((row, index) => {
		const source = rows[index];
		return {
			rollOverId: row.id,
			operationId: source?.operationId ?? 0,
			cartItemId: row.cartItemId,
			cartId: source?.cartId ?? 0,
			quantity: row.quantity.toString(),
			reason: row.reason,
		};
	});
}
