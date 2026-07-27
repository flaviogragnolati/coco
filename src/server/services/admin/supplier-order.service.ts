import { Prisma } from "~/prisma/client";
import {
	supplierOrderDetailSchema,
	supplierOrderListOutputSchema,
	supplierOrderStatsSchema,
	type supplierOrderStatusSchema,
} from "~/schemas/admin/supplier-order.schemas";
import type { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { writeAdminAuditLog } from "~/server/services/admin/_base/admin-audit";
import { recomputeOperationCounters } from "~/server/services/operations/operation-counters";
import type {
	SupplierOrderCancelInput,
	SupplierOrderCancelLineInput,
	SupplierOrderConfirmInput,
	SupplierOrderDetail,
	SupplierOrderListInput,
	SupplierOrderListItem,
	SupplierOrderRegisterDispatchInput,
	SupplierOrderRequestInput,
	SupplierOrderStats,
} from "~/shared/common/admin-crud/supplier-order.types";
import {
	isLegalTransition,
	supplierOrderAvailableActions,
	supplierOrderTransitions,
} from "~/shared/common/fulfillment-transitions";
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
	AdminPackagedLineChange,
	AdminSupplierOrderChangeSet,
	AdminSupplierOrderLineChange,
	AdminSupplierOrderRollOverChange,
} from "./operations-effects/operations-effects.types";
import { AdminOperationsSideEffects } from "./operations-effects/operations-side-effects.service";
import {
	createInboundPackage,
	createPackageAllocations,
	createPackageLines,
} from "./package.data";
import {
	type CoverageAssignment,
	type CoverageCandidate,
	planPackagedCoverage,
} from "./package-allocation-planner";
import {
	createPostAllocationRollOvers,
	type PostAllocationRollOverInput,
} from "./roll-over.data";
import { createShipment } from "./shipment.data";
import {
	countSupplierOrderCandidates,
	findSupplierOrderById,
	findSupplierOrderForCommand,
	getSupplierOrderStats,
	isLiveSupplierOrderLine,
	listSupplierOrderCandidates,
	packagedQuantity,
	remainingQuantity,
	resolveAllocationOrderItemCreatedAt,
	resolveAllocationPaidAt,
	type SupplierOrderCommandRecord,
	type SupplierOrderDetailRecord,
	type SupplierOrderSummaryRecord,
	updateAllocationQuantity,
	updateLotItemState,
	updateLotItemStatuses,
	updateLotStatuses,
	updateSupplierOrderState,
} from "./supplier-order.data";
import {
	type AbsorptionCandidate,
	type AbsorptionReduction,
	orderCandidatesLifo,
	planCutAbsorption,
} from "./supplier-order-absorption";
import { calculateSupplierOrderDiagnostics } from "./supplier-order-diagnostics";

type AdminDb = typeof db;
type SupplierOrderStatus = typeof supplierOrderStatusSchema._output;
type CommandLot = SupplierOrderCommandRecord["lots"][number];
type CommandLotItem = CommandLot["lotItems"][number];
type CommandAllocation = CommandLotItem["cartItemLotItems"][number];

const SUPPLIER_ORDER_ENTITY = "supplier_order";
const sideEffects = new AdminOperationsSideEffects();

const supplierOrderStatuses: SupplierOrderStatus[] = [
	"pending",
	"requested",
	"confirmed",
	"readyForReceipt",
	"completed",
	"cancelled",
];

const zero = () => new Prisma.Decimal(0);

function liveLines(
	record: SupplierOrderCommandRecord | SupplierOrderDetailRecord,
) {
	return record.lots.flatMap((lot) =>
		lot.lotItems
			.filter((lotItem) => isLiveSupplierOrderLine(lot, lotItem))
			.map((lotItem) => ({ lot, lotItem })),
	);
}

function toCandidate(allocation: CommandAllocation): AbsorptionCandidate {
	return {
		allocationId: allocation.id,
		cartItemId: allocation.cartItem.id,
		quantity: allocation.quantity,
		paidAt: resolveAllocationPaidAt(allocation.cartItem),
		orderItemCreatedAt: resolveAllocationOrderItemCreatedAt(
			allocation.cartItem,
		),
	};
}

function summarizeSupplierOrder(
	record: SupplierOrderSummaryRecord,
): SupplierOrderListItem & {
	diagnostics: ReturnType<typeof calculateSupplierOrderDiagnostics>;
} {
	const diagnostics = calculateSupplierOrderDiagnostics(record);
	const lotItems = record.lots.flatMap((lot) =>
		lot.lotItems.map((lotItem) => ({ lot, lotItem })),
	);
	const live = lotItems.filter(({ lot, lotItem }) =>
		isLiveSupplierOrderLine(lot, lotItem),
	);
	const operations = Array.from(
		new Map(
			record.lots.map((lot) => [lot.operation.id, lot.operation]),
		).values(),
	).sort((left, right) => left.id - right.id);

	return {
		id: record.id,
		code: record.code,
		externalReference: record.externalReference,
		status: record.status,
		supplier: record.supplier,
		operations,
		lotCount: record.lots.length,
		lotItemCount: lotItems.length,
		liveLotItemCount: live.length,
		lotItemQuantity: sumDecimals(
			lotItems.map(({ lotItem }) => lotItem.quantity),
		).toString(),
		liveLotItemQuantity: sumDecimals(
			live.map(({ lotItem }) => lotItem.quantity),
		).toString(),
		diagnosticCount: diagnostics.length,
		highestDiagnosticSeverity: highestSeverity(diagnostics),
		diagnosticMessages: diagnosticMessages(diagnostics),
		requestedAt: record.requestedAt,
		confirmedAt: record.confirmedAt,
		cancelledAt: record.cancelledAt,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		diagnostics,
	};
}

function toDetail(record: SupplierOrderDetailRecord): SupplierOrderDetail {
	const summary = summarizeSupplierOrder(record);
	const operationCompleted = record.lots.every(
		(lot) => lot.operation.status === "completed",
	);

	return supplierOrderDetailSchema.parse({
		...summary,
		availableActions: supplierOrderAvailableActions({
			status: record.status,
			operationCompleted: record.lots.length > 0 ? operationCompleted : false,
			liveLineCount: summary.liveLotItemCount,
			dispatchableQuantity: sumDecimals(
				liveLines(record).map(({ lotItem }) => remainingQuantity(lotItem)),
			).toString(),
		}),
		lots: record.lots.map((lot) => ({
			id: lot.id,
			code: lot.code,
			status: lot.status,
			operation: lot.operation,
			lotItems: lot.lotItems.map((lotItem) => {
				// Emitted in the order a cut would consume them, so the operator sees
				// who absorbs first before confirming anything.
				const ordered = orderCandidatesLifo(
					lotItem.cartItemLotItems.map(toCandidate),
				);
				const allocationById = new Map(
					lotItem.cartItemLotItems.map((allocation) => [
						allocation.id,
						allocation,
					]),
				);

				return {
					id: lotItem.id,
					code: lotItem.code,
					status: lotItem.status,
					quantity: lotItem.quantity.toString(),
					dispatchedQuantity: packagedQuantity(lotItem).toString(),
					remainingQuantity: remainingQuantity(lotItem).toString(),
					product: lotItem.productSupplierTerms.product,
					destination: lotItem.destination,
					demandAllocations: ordered.flatMap((candidate, index) => {
						const allocation = allocationById.get(candidate.allocationId);
						if (!allocation) return [];

						return [
							{
								id: allocation.id,
								quantity: allocation.quantity.toString(),
								absorptionOrder: index,
								paidAt: candidate.paidAt,
								cartItem: {
									id: allocation.cartItem.id,
									code: allocation.cartItem.code,
									cart: allocation.cartItem.cart,
								},
							},
						];
					}),
				};
			}),
		})),
		diagnostics: summary.diagnostics,
	});
}

export async function list(input: SupplierOrderListInput, database: AdminDb) {
	if (input.diagnosticState === "all") {
		const [total, records] = await Promise.all([
			countSupplierOrderCandidates(database, input),
			listSupplierOrderCandidates(database, input, {
				skip: (input.page - 1) * input.pageSize,
				take: input.pageSize,
			}),
		]);
		const items = records
			.map(summarizeSupplierOrder)
			.map(({ diagnostics: _diagnostics, ...item }) => item);

		return supplierOrderListOutputSchema.parse({
			items,
			page: input.page,
			pageSize: input.pageSize,
			total,
			pageCount: total === 0 ? 0 : Math.ceil(total / input.pageSize),
			truncated: false,
		});
	}

	const records = await listSupplierOrderCandidates(database, input, {
		take: DIAGNOSTIC_SCAN_LIMIT,
	});
	const summarized = records
		.map(summarizeSupplierOrder)
		.map(({ diagnostics: _diagnostics, ...item }) => item);

	return supplierOrderListOutputSchema.parse(
		resolveDiagnosticListPage(summarized, input, records.length),
	);
}

export async function getById(id: number, database: AdminDb) {
	const record = await findSupplierOrderById(database, id);
	if (!record) throwNotFound("Orden de proveedor");
	return toDetail(record);
}

export async function getStats(database: AdminDb): Promise<SupplierOrderStats> {
	const [stats, scanRecords] = await Promise.all([
		getSupplierOrderStats(database),
		listSupplierOrderCandidates(
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
		supplierOrderStatuses.map((status) => [
			status,
			byStatusCounts.get(status) ?? 0,
		]),
	) as Record<SupplierOrderStatus, number>;

	const withDiagnostics = scanRecords
		.map(summarizeSupplierOrder)
		.filter((summary) => summary.diagnosticCount > 0).length;

	return supplierOrderStatsSchema.parse({
		total: stats.total,
		byStatus,
		lotItemQuantity: decimal(stats.lotItemQuantity).toString(),
		openLineCount: stats.openLineCount,
		withDiagnostics,
		truncated: scanRecords.length >= DIAGNOSTIC_SCAN_LIMIT,
	});
}

async function loadForCommand(
	tx: Prisma.TransactionClient,
	id: number,
): Promise<SupplierOrderCommandRecord> {
	const record = await findSupplierOrderForCommand(tx, id);
	if (!record) throwNotFound("Orden de proveedor");
	return record;
}

function assertLegal(
	record: SupplierOrderCommandRecord,
	target: SupplierOrderStatus,
	message: string,
) {
	if (!isLegalTransition(supplierOrderTransitions, record.status, target)) {
		throwConflict(message);
	}
}

/**
 * Cancelling mints a roll over per live allocation *at full quantity*. Once part
 * of the line already sits in a live inbound package, that double-counts against
 * ADR 0005 — the packaged quantity is owed to the demand twice — and no
 * diagnostic catches it, because `assigned + rollOver` still sums correctly.
 * Packaged quantity leaves through `package.writeOff`, which is why the message
 * names it.
 */
function assertNothingPackaged(
	lines: Array<{ lotItem: CommandLotItem }>,
	scope: "order" | "line",
) {
	if (!lines.some(({ lotItem }) => packagedQuantity(lotItem).gt(zero())))
		return;

	throwConflict(
		scope === "order"
			? "La orden tiene cantidad ya empaquetada; dar de baja el paquete antes de cancelar"
			: "La linea tiene cantidad ya empaquetada; dar de baja el paquete antes de cancelar",
	);
}

function operationIds(record: SupplierOrderCommandRecord) {
	return Array.from(new Set(record.lots.map((lot) => lot.operation.id)));
}

/** Roll overs attach to the lot's own operation, never to a "current" one. */
async function recomputeTouchedOperations(
	tx: Prisma.TransactionClient,
	record: SupplierOrderCommandRecord,
) {
	for (const operationId of operationIds(record)) {
		await recomputeOperationCounters(tx, operationId);
	}
}

function toLineChange(
	lot: CommandLot,
	lotItem: CommandLotItem,
	allocations: Array<{
		allocation: CommandAllocation;
		quantity: Prisma.Decimal;
	}>,
): AdminSupplierOrderLineChange {
	return {
		lotId: lot.id,
		lotItemId: lotItem.id,
		allocations: allocations.map(({ allocation, quantity }) => ({
			cartItemId: allocation.cartItem.id,
			cartId: allocation.cartItem.cart.id,
			quantity: quantity.toString(),
		})),
	};
}

async function persistRollOvers(
	tx: Prisma.TransactionClient,
	rows: Array<
		PostAllocationRollOverInput & { cartId: number; operationId: number }
	>,
): Promise<AdminSupplierOrderRollOverChange[]> {
	const created = await createPostAllocationRollOvers(tx, rows);

	return created.map((row, index) => {
		const input = rows[index];
		return {
			rollOverId: row.id,
			operationId: input?.operationId ?? 0,
			cartItemId: row.cartItemId,
			cartId: input?.cartId ?? 0,
			quantity: row.quantity.toString(),
			reason: row.reason,
		};
	});
}

export async function request(
	input: SupplierOrderRequestInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<SupplierOrderDetail> {
	const result = await database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);
		assertLegal(
			record,
			"requested",
			"Solo se puede solicitar una orden de proveedor pendiente",
		);

		const lines = liveLines(record);
		if (lines.length === 0) {
			throwConflict("La orden de proveedor no tiene lineas activas");
		}
		// A non-completed operation means the materialization is not trustworthy;
		// requesting from it would send the supplier a half-built order.
		if (record.lots.some((lot) => lot.operation.status !== "completed")) {
			throwConflict(
				"La operacion de origen no esta completada; no se puede solicitar la orden",
			);
		}

		const before = toDetail(record);

		await updateSupplierOrderState(tx, record.id, {
			status: "requested",
			requestedAt: new Date(),
			externalReference: input.externalReference,
		});
		await updateLotStatuses(
			tx,
			record.lots
				.filter((lot) => lot.status !== "cancelled")
				.map((lot) => lot.id),
			"requested",
		);
		await updateLotItemStatuses(
			tx,
			lines.map(({ lotItem }) => lotItem.id),
			"requested",
		);

		const changeSet: AdminSupplierOrderChangeSet = {
			supplierOrderId: record.id,
			supplierOrderCode: record.code,
			operationId: record.lots[0]?.operation.id ?? 0,
			requestedLines: lines.map(({ lot, lotItem }) =>
				toLineChange(
					lot,
					lotItem,
					lotItem.cartItemLotItems
						.filter((allocation) => allocation.quantity.gt(zero()))
						.map((allocation) => ({
							allocation,
							quantity: allocation.quantity,
						})),
				),
			),
		};

		const effects = await sideEffects.onSupplierOrderRequested(
			{ db: tx, actor, source: "supplierOrder" },
			changeSet,
		);

		const after = toDetail(await loadForCommand(tx, record.id));

		await writeAdminAuditLog(tx, {
			action: "supplierOrder.request",
			actor,
			entityType: SUPPLIER_ORDER_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: { effects, externalReference: input.externalReference },
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

type ConfirmLinePlan = {
	lot: CommandLot;
	lotItem: CommandLotItem;
	confirmedQuantity: Prisma.Decimal;
	reductions: AbsorptionReduction[];
	cancelled: boolean;
};

function planConfirmLine(
	lot: CommandLot,
	lotItem: CommandLotItem,
	line: SupplierOrderConfirmInput["lines"][number],
): ConfirmLinePlan {
	const current = lotItem.quantity;
	const confirmedQuantity = new Prisma.Decimal(line.confirmedQuantity);

	if (confirmedQuantity.gt(current)) {
		throwConflict(
			`No se puede confirmar mas de lo solicitado en la linea ${lotItem.code}`,
		);
	}

	if (confirmedQuantity.equals(current)) {
		return {
			lot,
			lotItem,
			confirmedQuantity,
			reductions: [],
			cancelled: false,
		};
	}

	if (confirmedQuantity.isZero()) {
		// The whole line is refused. Quantities stay as history — only the status
		// moves — and every allocation rolls over in full.
		return {
			lot,
			lotItem,
			confirmedQuantity,
			reductions: lotItem.cartItemLotItems
				.filter((allocation) => allocation.quantity.gt(zero()))
				.map((allocation) => ({
					allocationId: allocation.id,
					cartItemId: allocation.cartItem.id,
					removedQuantity: allocation.quantity,
					remainingQuantity: zero(),
				})),
			cancelled: true,
		};
	}

	return {
		lot,
		lotItem,
		confirmedQuantity,
		reductions: planCutAbsorption({
			candidates: lotItem.cartItemLotItems.map(toCandidate),
			cut: current.minus(confirmedQuantity),
			overrides: line.overrides?.map((override) => ({
				allocationId: override.allocationId,
				removedQuantity: new Prisma.Decimal(override.removedQuantity),
			})),
		}),
		cancelled: false,
	};
}

export async function confirm(
	input: SupplierOrderConfirmInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<SupplierOrderDetail> {
	const result = await runSerializable(database, async (tx) => {
		const record = await loadForCommand(tx, input.id);
		assertLegal(
			record,
			"confirmed",
			"Solo se puede confirmar una orden de proveedor solicitada",
		);

		const lines = liveLines(record);
		if (lines.length === 0) {
			throwConflict("La orden de proveedor no tiene lineas activas");
		}

		// Implicitly full-confirming the lines an operator omitted would confirm
		// quantity the supplier never confirmed, so a partial payload is refused.
		const submitted = new Map(
			input.lines.map((line) => [line.lotItemId, line]),
		);
		if (submitted.size !== input.lines.length) {
			throwConflict("Cada linea se puede enviar una sola vez");
		}
		for (const line of input.lines) {
			if (!lines.some(({ lotItem }) => lotItem.id === line.lotItemId)) {
				throwConflict(
					`La linea #${line.lotItemId} no pertenece a esta orden o esta cancelada`,
				);
			}
		}
		for (const { lotItem } of lines) {
			if (!submitted.has(lotItem.id)) {
				throwConflict(`Falta confirmar la linea ${lotItem.code} de la orden`);
			}
		}

		const before = toDetail(record);
		const plans = lines.map(({ lot, lotItem }) => {
			const line = submitted.get(lotItem.id);
			if (!line) throwConflict(`Falta confirmar la linea ${lotItem.code}`);
			return planConfirmLine(lot, lotItem, line);
		});

		const rollOverRows: Array<
			PostAllocationRollOverInput & { cartId: number; operationId: number }
		> = [];
		const confirmedLines: AdminSupplierOrderLineChange[] = [];

		for (const plan of plans) {
			const allocationById = new Map(
				plan.lotItem.cartItemLotItems.map((allocation) => [
					allocation.id,
					allocation,
				]),
			);
			const reductionById = new Map(
				plan.reductions.map((reduction) => [reduction.allocationId, reduction]),
			);

			if (plan.cancelled) {
				await updateLotItemState(tx, plan.lotItem.id, {
					status: "cancelled",
				});
			} else {
				await updateLotItemState(tx, plan.lotItem.id, {
					status: "confirmed",
					quantity: plan.confirmedQuantity.equals(plan.lotItem.quantity)
						? undefined
						: plan.confirmedQuantity,
				});

				for (const reduction of plan.reductions) {
					// The row survives at quantity 0: CartItemTrackingEvent and
					// PackageAllocation reference it, and both relations are optional,
					// so a delete would silently null historical references.
					await updateAllocationQuantity(
						tx,
						reduction.allocationId,
						reduction.remainingQuantity,
					);
				}
			}

			for (const reduction of plan.reductions) {
				const allocation = allocationById.get(reduction.allocationId);
				if (!allocation) continue;

				rollOverRows.push({
					cartItemId: reduction.cartItemId,
					cartId: allocation.cartItem.cart.id,
					operationId: plan.lot.operation.id,
					quantity: reduction.removedQuantity,
					reason: plan.cancelled
						? `Linea ${plan.lotItem.code} no confirmada por el proveedor`
						: `Confirmacion parcial del proveedor en la linea ${plan.lotItem.code}`,
				});
			}

			if (plan.cancelled) continue;

			// Only allocations that survive with quantity carry a "confirmed"
			// journey notice; a fully cut one gets its roll over event instead.
			const surviving = plan.lotItem.cartItemLotItems
				.map((allocation) => ({
					allocation,
					quantity:
						reductionById.get(allocation.id)?.remainingQuantity ??
						allocation.quantity,
				}))
				.filter(({ quantity }) => quantity.gt(zero()));

			if (surviving.length > 0) {
				confirmedLines.push(toLineChange(plan.lot, plan.lotItem, surviving));
			}
		}

		const statusByLotItemId = new Map(
			plans.map((plan) => [
				plan.lotItem.id,
				plan.cancelled ? "cancelled" : "confirmed",
			]),
		);

		for (const lot of record.lots) {
			if (lot.status === "cancelled") continue;

			const resolved = lot.lotItems.map(
				(lotItem) => statusByLotItemId.get(lotItem.id) ?? lotItem.status,
			);
			const allCancelled = resolved.every((status) => status === "cancelled");

			await updateLotStatuses(
				tx,
				[lot.id],
				allCancelled ? "cancelled" : "confirmed",
			);
		}

		const everyLineCancelled = plans.every((plan) => plan.cancelled);
		await updateSupplierOrderState(tx, record.id, {
			status: everyLineCancelled ? "cancelled" : "confirmed",
			confirmedAt: everyLineCancelled ? undefined : new Date(),
			cancelledAt: everyLineCancelled ? new Date() : undefined,
			externalReference: input.externalReference,
		});

		const createdRollOvers = await persistRollOvers(tx, rollOverRows);

		await recomputeTouchedOperations(tx, record);

		const effects = await sideEffects.onSupplierOrderConfirmed(
			{ db: tx, actor, source: "supplierOrder" },
			{
				supplierOrderId: record.id,
				supplierOrderCode: record.code,
				operationId: record.lots[0]?.operation.id ?? 0,
				confirmedLines,
				createdRollOvers,
			},
		);

		const after = toDetail(await loadForCommand(tx, record.id));

		await writeAdminAuditLog(tx, {
			action: "supplierOrder.confirm",
			actor,
			entityType: SUPPLIER_ORDER_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: {
				effects,
				externalReference: input.externalReference,
				lines: plans.map((plan) => ({
					lotItemId: plan.lotItem.id,
					lotItemCode: plan.lotItem.code,
					previousQuantity: plan.lotItem.quantity.toString(),
					confirmedQuantity: plan.confirmedQuantity.toString(),
					cancelled: plan.cancelled,
					absorption: plan.reductions.map((reduction) => ({
						allocationId: reduction.allocationId,
						cartItemId: reduction.cartItemId,
						removedQuantity: reduction.removedQuantity.toString(),
						remainingQuantity: reduction.remainingQuantity.toString(),
					})),
				})),
			},
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

type DispatchLinePlan = {
	lot: CommandLot;
	lotItem: CommandLotItem;
	quantity: Prisma.Decimal;
	coverage: CoverageAssignment[];
};

/**
 * How much of each demand allocation behind this line is not yet covered by a
 * live inbound packaged allocation. A second dispatch for the remainder must
 * serve the demand the first one left uncovered, not start over.
 */
function coverageCandidates(lotItem: CommandLotItem): CoverageCandidate[] {
	return lotItem.cartItemLotItems.map((allocation) => {
		const covered = allocation.packageAllocations
			.filter(
				(packaged) =>
					packaged.packageLotItem.package.leg === "inbound" &&
					packaged.packageLotItem.package.status !== "cancelled" &&
					packaged.packageLotItem.status !== "cancelled",
			)
			.reduce<Prisma.Decimal>(
				(total, packaged) => total.plus(packaged.quantity),
				zero(),
			);
		const uncovered = allocation.quantity.minus(covered);

		return {
			allocationId: allocation.id,
			cartItemId: allocation.cartItem.id,
			uncoveredQuantity: uncovered.lessThan(zero()) ? zero() : uncovered,
			paidAt: resolveAllocationPaidAt(allocation.cartItem),
			orderItemCreatedAt: resolveAllocationOrderItemCreatedAt(
				allocation.cartItem,
			),
		};
	});
}

/**
 * The destination snapshot is only meaningful when the whole dispatch goes to one
 * place; a mixed truck would misrepresent itself with either destination.
 */
function dispatchDestinationSnapshot(plans: DispatchLinePlan[]) {
	const destinations = new Map(
		plans.map(({ lotItem }) => [lotItem.destination.id, lotItem.destination]),
	);
	if (destinations.size !== 1) return undefined;

	const destination = Array.from(destinations.values())[0];
	if (!destination) return undefined;

	return {
		destinationId: destination.id,
		name: destination.name,
	};
}

export async function registerDispatch(
	input: SupplierOrderRegisterDispatchInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<SupplierOrderDetail> {
	const result = await runSerializable(database, async (tx) => {
		const record = await loadForCommand(tx, input.id);

		// Deliberately not `isLegalTransition`: a second dispatch for the remainder
		// leaves the order at `readyForReceipt`, which is not a ladder move (A11).
		if (record.status !== "confirmed" && record.status !== "readyForReceipt") {
			throwConflict(
				"Solo se puede despachar una orden de proveedor confirmada",
			);
		}

		const lines = liveLines(record);
		const byLotItemId = new Map(
			lines.map(({ lot, lotItem }) => [lotItem.id, { lot, lotItem }]),
		);

		const submitted = new Map(
			input.lines.map((line) => [line.lotItemId, line]),
		);
		if (submitted.size !== input.lines.length) {
			throwConflict("Cada linea se puede enviar una sola vez");
		}

		const plans: DispatchLinePlan[] = [];
		for (const line of input.lines) {
			const target = byLotItemId.get(line.lotItemId);
			if (!target) {
				throwConflict(
					`La linea #${line.lotItemId} no pertenece a esta orden o esta cancelada`,
				);
			}

			const quantity = new Prisma.Decimal(line.quantity);
			// A zero means "not in this dispatch": creating an empty package line
			// would trip `package.line.noPackagedAllocations` by construction.
			if (quantity.lte(zero())) continue;

			const remaining = remainingQuantity(target.lotItem);
			if (quantity.gt(remaining)) {
				throwConflict(
					`La linea ${target.lotItem.code} solo tiene ${remaining.toString()} pendiente de despacho`,
				);
			}

			plans.push({
				lot: target.lot,
				lotItem: target.lotItem,
				quantity,
				coverage: planPackagedCoverage({
					candidates: coverageCandidates(target.lotItem),
					quantity,
				}),
			});
		}

		if (plans.length === 0) {
			throwConflict("El despacho no tiene cantidad para ninguna linea");
		}

		const before = toDetail(record);

		const shipment = await createShipment(tx, {
			name: input.shipment.name,
			internalCode: input.shipment.internalCode,
			trackingCode: input.shipment.trackingCode,
			type: "internalTransfer",
			status: "readyForDispatch",
			destinationAddressSnapshot: dispatchDestinationSnapshot(plans),
		}).catch((error: unknown) => {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throwConflict(
					`Ya existe un envio con el codigo interno ${input.shipment.internalCode}`,
				);
			}
			throw error;
		});

		const createdPackage = await createInboundPackage(tx, {
			name: input.packageName,
			shipmentId: shipment.id,
		});

		const createdLines = await createPackageLines(
			tx,
			plans.map((plan) => ({
				packageId: createdPackage.id,
				lotItemId: plan.lotItem.id,
				quantity: plan.quantity,
			})),
		);
		const packageLineIdByLotItemId = new Map(
			createdLines.map((line) => [line.lotItemId, line.id]),
		);

		const packagedLines: AdminPackagedLineChange[] = [];
		for (const plan of plans) {
			const packageLotItemId = packageLineIdByLotItemId.get(plan.lotItem.id);
			if (packageLotItemId === undefined) {
				throwConflict(
					`No se pudo crear la linea de paquete para ${plan.lotItem.code}`,
				);
			}

			await createPackageAllocations(
				tx,
				plan.coverage.map((assignment) => ({
					packageLotItemId,
					cartItemLotItemId: assignment.allocationId,
					quantity: assignment.quantity,
				})),
			);

			const cartIdByAllocationId = new Map(
				plan.lotItem.cartItemLotItems.map((allocation) => [
					allocation.id,
					allocation.cartItem.cart.id,
				]),
			);

			packagedLines.push({
				packageId: createdPackage.id,
				packageLotItemId,
				lotItemId: plan.lotItem.id,
				allocations: plan.coverage.map((assignment) => ({
					cartItemId: assignment.cartItemId,
					cartId: cartIdByAllocationId.get(assignment.allocationId) ?? 0,
					quantity: assignment.quantity.toString(),
				})),
			});
		}

		if (record.status === "confirmed") {
			await updateSupplierOrderState(tx, record.id, {
				status: "readyForReceipt",
			});
		}

		// No counter recompute: nothing moved between `assigned` and `rollOver`.
		// Packaging covers demand that is already assigned.
		const effects = await sideEffects.onDispatchRegistered(
			{ db: tx, actor, source: "supplierOrder" },
			{
				shipmentId: shipment.id,
				shipmentInternalCode: shipment.internalCode,
				supplierOrderId: record.id,
				packagedLines,
			},
		);

		const after = toDetail(await loadForCommand(tx, record.id));

		await writeAdminAuditLog(tx, {
			action: "supplierOrder.registerDispatch",
			actor,
			entityType: SUPPLIER_ORDER_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: {
				effects,
				shipmentId: shipment.id,
				shipmentInternalCode: shipment.internalCode,
				packageId: createdPackage.id,
				packageName: input.packageName,
				lines: plans.map((plan) => ({
					lotItemId: plan.lotItem.id,
					lotItemCode: plan.lotItem.code,
					dispatchedQuantity: plan.quantity.toString(),
					coverage: plan.coverage.map((assignment) => ({
						allocationId: assignment.allocationId,
						cartItemId: assignment.cartItemId,
						quantity: assignment.quantity.toString(),
					})),
				})),
			},
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

export async function cancel(
	input: SupplierOrderCancelInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<SupplierOrderDetail> {
	const result = await runSerializable(database, async (tx) => {
		const record = await loadForCommand(tx, input.id);
		assertLegal(
			record,
			"cancelled",
			"La orden de proveedor ya no se puede cancelar",
		);

		const before = toDetail(record);
		const lines = liveLines(record);
		assertNothingPackaged(lines, "order");

		await updateSupplierOrderState(tx, record.id, {
			status: "cancelled",
			cancelledAt: new Date(),
		});
		await updateLotStatuses(
			tx,
			record.lots
				.filter((lot) => lot.status !== "cancelled")
				.map((lot) => lot.id),
			"cancelled",
		);
		// Quantities stay untouched: a cancelled line keeps its requested amount
		// as history, and the counter rules exclude it by status.
		await updateLotItemStatuses(
			tx,
			lines.map(({ lotItem }) => lotItem.id),
			"cancelled",
		);

		const createdRollOvers = await persistRollOvers(
			tx,
			lines.flatMap(({ lot, lotItem }) =>
				lotItem.cartItemLotItems
					.filter((allocation) => allocation.quantity.gt(zero()))
					.map((allocation) => ({
						cartItemId: allocation.cartItem.id,
						cartId: allocation.cartItem.cart.id,
						operationId: lot.operation.id,
						quantity: allocation.quantity,
						reason: `Orden de proveedor cancelada: ${input.reason}`,
					})),
			),
		);

		await recomputeTouchedOperations(tx, record);

		const effects = await sideEffects.onSupplierOrderCancelled(
			{ db: tx, actor, source: "supplierOrder" },
			{
				supplierOrderId: record.id,
				supplierOrderCode: record.code,
				operationId: record.lots[0]?.operation.id ?? 0,
				createdRollOvers,
			},
		);

		const after = toDetail(await loadForCommand(tx, record.id));

		await writeAdminAuditLog(tx, {
			action: "supplierOrder.cancel",
			actor,
			entityType: SUPPLIER_ORDER_ENTITY,
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

export async function cancelLine(
	input: SupplierOrderCancelLineInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<SupplierOrderDetail> {
	const result = await runSerializable(database, async (tx) => {
		const record = await loadForCommand(tx, input.id);
		// The order stays where it is; the ladder is consulted only to check that
		// cancelling anything is still legal at this stage.
		assertLegal(
			record,
			"cancelled",
			"La orden de proveedor ya no admite cancelaciones",
		);

		const target = liveLines(record).find(
			({ lotItem }) => lotItem.id === input.lotItemId,
		);
		if (!target) {
			throwConflict("La linea no pertenece a esta orden o ya esta cancelada");
		}
		assertNothingPackaged([target], "line");

		const before = toDetail(record);

		await updateLotItemStatuses(tx, [target.lotItem.id], "cancelled");

		const createdRollOvers = await persistRollOvers(
			tx,
			target.lotItem.cartItemLotItems
				.filter((allocation) => allocation.quantity.gt(zero()))
				.map((allocation) => ({
					cartItemId: allocation.cartItem.id,
					cartId: allocation.cartItem.cart.id,
					operationId: target.lot.operation.id,
					quantity: allocation.quantity,
					reason: `Linea de proveedor cancelada: ${input.reason}`,
				})),
		);

		const remainingInLot = target.lot.lotItems.filter(
			(lotItem) =>
				lotItem.id !== target.lotItem.id && lotItem.status !== "cancelled",
		);
		if (remainingInLot.length === 0) {
			await updateLotStatuses(tx, [target.lot.id], "cancelled");
		}

		const remainingInOrder = liveLines(record).filter(
			({ lotItem }) => lotItem.id !== target.lotItem.id,
		);
		if (remainingInOrder.length === 0) {
			await updateSupplierOrderState(tx, record.id, {
				status: "cancelled",
				cancelledAt: new Date(),
			});
		}

		await recomputeTouchedOperations(tx, record);

		const effects = await sideEffects.onSupplierOrderLineCancelled(
			{ db: tx, actor, source: "supplierOrder" },
			{
				supplierOrderId: record.id,
				supplierOrderCode: record.code,
				operationId: target.lot.operation.id,
				createdRollOvers,
			},
		);

		const after = toDetail(await loadForCommand(tx, record.id));

		await writeAdminAuditLog(tx, {
			action: "supplierOrder.cancelLine",
			actor,
			entityType: SUPPLIER_ORDER_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: {
				effects,
				reason: input.reason,
				lotItemId: target.lotItem.id,
				lotItemCode: target.lotItem.code,
			},
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}
