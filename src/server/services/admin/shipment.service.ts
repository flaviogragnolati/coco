import { Prisma } from "~/prisma/client";
import {
	shipmentDetailSchema,
	shipmentListOutputSchema,
	shipmentStatsSchema,
	type shipmentStatusSchema,
	type shipmentTypeSchema,
} from "~/schemas/admin/shipment.schemas";
import type { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { writeAdminAuditLog } from "~/server/services/admin/_base/admin-audit";
import { recomputeOperationCounters } from "~/server/services/operations/operation-counters";
import type {
	PackageLotItemStatus,
	PackageStatus,
} from "~/shared/common/admin-crud/package.types";
import type {
	DeliveryMode,
	ShipmentAddPackagesInput,
	ShipmentCreateEndUserInput,
	ShipmentDeliverInput,
	ShipmentDetail,
	ShipmentExceptionInput,
	ShipmentIdInput,
	ShipmentListInput,
	ShipmentListItem,
	ShipmentReceiveInput,
	ShipmentRetryInput,
	ShipmentStats,
} from "~/shared/common/admin-crud/shipment.types";
import {
	dispatchableShipmentStatuses,
	isLegalTransition,
	shipmentAvailableActions,
	shipmentTransitions,
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
	AdminPackagedLineChange,
	AdminShipmentChangeSet,
	AdminSupplierOrderRollOverChange,
} from "./operations-effects/operations-effects.types";
import { AdminOperationsSideEffects } from "./operations-effects/operations-side-effects.service";
import {
	findPackagesForShipmentAssignment,
	type PackageAssignmentRecord,
	reassignPackagesToShipment,
	updatePackageLineStatuses,
	updatePackageStatuses,
} from "./package.data";
import type { ShortfallCandidate } from "./package-allocation-planner";
import { applyPackagedShortfall } from "./packaged-shortfall";
import {
	createPostAllocationRollOvers,
	type PostAllocationRollOverInput,
} from "./roll-over.data";
import {
	countShipmentCandidates,
	createShipment,
	findShipmentById,
	findShipmentForCommand,
	findShipmentForReceipt,
	getShipmentStats,
	listLatestShipmentTrackingEvents,
	listShipmentCandidates,
	type ShipmentCommandRecord,
	type ShipmentDetailRecord,
	type ShipmentReceiveRecord,
	type ShipmentSummaryRecord,
	type ShipmentTrackingEventRecord,
	updateShipmentState,
} from "./shipment.data";
import { calculateShipmentDiagnostics } from "./shipment-diagnostics";
import {
	findSupplierOrderForCommand,
	remainingQuantity,
	resolveAllocationOrderItemCreatedAt,
	resolveAllocationPaidAt,
	updateAllocationQuantity,
	updateLotItemState,
	updateLotItemStatuses,
	updateLotStatuses,
	updateSupplierOrderState,
} from "./supplier-order.data";
import { planCutAbsorption } from "./supplier-order-absorption";

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

/** Cancelled packages are filtered out before the action matrix sees them (T3's contract). */
function livePackages(record: { packages: Array<{ status: PackageStatus }> }) {
	return record.packages.filter((pkg) => pkg.status !== "cancelled");
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
		deliveryMode: record.deliveryMode,
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
		availableActions: shipmentAvailableActions({
			status: record.status,
			type: record.type,
			deliveryMode: record.deliveryMode,
			packageCount: record.packages.length,
			livePackageCount: livePackages(record).length,
		}),
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
				leg: pkg.leg,
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

const SHIPMENT_ENTITY = "shipment";
const sideEffects = new AdminOperationsSideEffects();
const zero = () => new Prisma.Decimal(0);

type CommandPackage = ShipmentCommandRecord["packages"][number];
type ReceivePackage = ShipmentReceiveRecord["packages"][number];
type ReceiveLine = ReceivePackage["packageLotItems"][number];

async function loadForCommand(
	tx: Prisma.TransactionClient,
	id: number,
): Promise<ShipmentCommandRecord> {
	const record = await findShipmentForCommand(tx, id);
	if (!record) throwNotFound("Envio");
	return record;
}

/** The detail the router returns is read outside the command transaction's select. */
async function detailOf(
	tx: Prisma.TransactionClient,
	id: number,
	database: AdminDb,
): Promise<ShipmentDetail> {
	const record = await findShipmentById(tx, id);
	if (!record) throwNotFound("Envio");
	return toDetail(record, database);
}

function assertLegal(
	from: ShipmentStatus,
	target: ShipmentStatus,
	message: string,
) {
	if (!isLegalTransition(shipmentTransitions, from, target)) {
		throwConflict(message);
	}
}

function liveCommandPackages(record: ShipmentCommandRecord) {
	return record.packages.filter((pkg) => pkg.status !== "cancelled");
}

function liveLines<TLine extends { status: PackageLotItemStatus }>(pkg: {
	packageLotItems: TLine[];
}) {
	return pkg.packageLotItems.filter((line) => line.status !== "cancelled");
}

/** The change-set shape both the movement and the exception events read. */
function toMovedLines(packages: CommandPackage[]): AdminPackagedLineChange[] {
	return packages.flatMap((pkg) =>
		liveLines(pkg).map((line) => ({
			packageId: pkg.id,
			packageLotItemId: line.id,
			lotItemId: line.lotItemId,
			allocations: line.packageAllocations.map((allocation) => ({
				cartItemId: allocation.cartItemLotItem.cartItem.id,
				cartId: allocation.cartItemLotItem.cartItem.cartId,
				quantity: allocation.quantity.toString(),
			})),
		})),
	);
}

export async function dispatch(
	input: ShipmentIdInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<ShipmentDetail> {
	// Default isolation: a departure moves statuses only, no quantity.
	const result = await database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);
		assertLegal(record.status, "inTransit", "El envio ya salio");
		const isEndUser = record.type === "endUserDelivery";
		if (isEndUser && record.deliveryMode === null) {
			throwConflict("El envio no tiene modo de entrega");
		}

		const packages = liveCommandPackages(record);
		if (packages.length === 0) {
			throwConflict("El envio no tiene paquetes activos");
		}

		const before = await detailOf(tx, record.id, database);

		await updateShipmentState(tx, record.id, { status: "inTransit" });
		await updatePackageStatuses(
			tx,
			packages.map((pkg) => pkg.id),
			"inTransit",
		);
		await updatePackageLineStatuses(
			tx,
			packages.flatMap((pkg) => liveLines(pkg).map((line) => line.id)),
			"shipped",
		);

		// The cascade is identical on both legs; only the fact published differs.
		const changeSet = {
			shipmentId: record.id,
			shipmentInternalCode: record.internalCode,
			movedLines: toMovedLines(packages),
		};
		const effects = isEndUser
			? await sideEffects.onEndUserDispatched(
					{ db: tx, actor, source: "shipment" },
					changeSet,
				)
			: await sideEffects.onShipmentDispatched(
					{ db: tx, actor, source: "shipment" },
					changeSet,
				);

		const after = await detailOf(tx, record.id, database);

		await writeAdminAuditLog(tx, {
			action: "shipment.dispatch",
			actor,
			entityType: SHIPMENT_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: { effects, packageIds: packages.map((pkg) => pkg.id) },
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

type ReceiveLinePlan = {
	pkg: ReceivePackage;
	line: ReceiveLine;
	receivedQuantity: Prisma.Decimal;
	shortfall: Prisma.Decimal;
	reason?: string;
	overrides?: ShipmentReceiveInput["lines"][number]["overrides"];
};

function receiveCandidates(line: ReceiveLine): ShortfallCandidate[] {
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

/**
 * What actually arrived, per line and cart item: the packaged quantity minus what
 * the shortfall took back. Only allocations that survive with quantity carry a
 * "received at warehouse" journey notice — a fully cut one gets its roll over
 * event instead, the same rule `confirm` follows for a supplier cut.
 */
function receivedLines(
	plans: ReceiveLinePlan[],
	removedByLineId: Map<number, Map<number, Prisma.Decimal>>,
): AdminPackagedLineChange[] {
	return plans.flatMap((plan) => {
		const removed = removedByLineId.get(plan.line.id);
		const allocations = plan.line.packageAllocations.flatMap((allocation) => {
			const cartItemId = allocation.cartItemLotItem.cartItem.id;
			const surviving = allocation.quantity.minus(
				removed?.get(cartItemId) ?? zero(),
			);
			if (surviving.lte(zero())) return [];

			return [
				{
					cartItemId,
					cartId: allocation.cartItemLotItem.cartItem.cartId,
					quantity: surviving.toString(),
				},
			];
		});

		if (allocations.length === 0) return [];

		return [
			{
				packageId: plan.pkg.id,
				packageLotItemId: plan.line.id,
				lotItemId: plan.line.lotItemId,
				allocations,
			},
		];
	});
}

function receiveAllocations(line: ReceiveLine) {
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

export async function receive(
	input: ShipmentReceiveInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<ShipmentDetail> {
	const result = await runSerializable(database, async (tx) => {
		const record = await findShipmentForReceipt(tx, input.id);
		if (!record) throwNotFound("Envio");
		assertLegal(record.status, "received", "El envio no se puede recibir");
		// A receipt absorbs shortfalls and closes supplier orders — an inbound
		// story. The end-user leg closes with `deliver`, which moves no quantity.
		if (record.type === "endUserDelivery") {
			throwConflict("Un envio al cliente se cierra con la entrega");
		}

		const packages = record.packages.filter(
			(pkg) => pkg.status !== "cancelled",
		);
		const lines = packages.flatMap((pkg) =>
			liveLines(pkg).map((line) => ({ pkg, line })),
		);
		if (lines.length === 0) {
			throwConflict("El envio no tiene lineas activas");
		}

		// A partial payload would implicitly receive in full the lines an operator
		// forgot, recording arrivals that never happened — the rule `confirm`
		// established for supplier confirmation (architecture §21.2).
		const submitted = new Map(
			input.lines.map((line) => [line.packageLotItemId, line]),
		);
		if (submitted.size !== input.lines.length) {
			throwConflict("Cada linea se puede enviar una sola vez");
		}
		for (const line of input.lines) {
			if (!lines.some(({ line: own }) => own.id === line.packageLotItemId)) {
				throwConflict(
					`La linea #${line.packageLotItemId} no pertenece a este envio o esta cancelada`,
				);
			}
		}

		const plans: ReceiveLinePlan[] = [];
		for (const { pkg, line } of lines) {
			const declared = submitted.get(line.id);
			if (!declared) {
				throwConflict(`Falta recibir la linea #${line.id} del envio`);
			}

			const receivedQuantity = new Prisma.Decimal(declared.receivedQuantity);
			if (receivedQuantity.gt(line.quantity)) {
				// There is no demand to attach the excess to; a second dispatch is the
				// way to represent an over-delivery.
				throwConflict(
					`La linea #${line.id} declara ${receivedQuantity.toString()} recibido sobre ${line.quantity.toString()} despachado`,
				);
			}

			const shortfall = line.quantity.minus(receivedQuantity);
			if (shortfall.gt(zero()) && !declared.reason) {
				throwConflict(
					`La linea #${line.id} tiene faltante y necesita un motivo`,
				);
			}

			plans.push({
				pkg,
				line,
				receivedQuantity,
				shortfall,
				reason: declared.reason,
				overrides: declared.overrides,
			});
		}

		const before = await detailOf(tx, record.id, database);
		const rollOverRows: Array<
			PostAllocationRollOverInput & { cartId: number }
		> = [];
		const removedByLineId = new Map<number, Map<number, Prisma.Decimal>>();

		for (const plan of plans) {
			if (plan.shortfall.lte(zero())) continue;

			const { rollOverRows: rows, removedLine } = await applyPackagedShortfall(
				tx,
				{
					packageId: plan.pkg.id,
					packageLotItemId: plan.line.id,
					lineQuantity: plan.line.quantity,
					shortfall: plan.shortfall,
					cancelLine: plan.receivedQuantity.isZero(),
					lotItemId: plan.line.lotItem.id,
					lotItemQuantity: plan.line.lotItem.quantity,
					operationId: plan.line.lotItem.lot.operationId,
					reason: `Faltante en recepcion del envio ${record.internalCode}: ${plan.reason ?? ""}`,
					candidates: receiveCandidates(plan.line),
					overrides: plan.overrides?.map((override) => ({
						allocationId: override.allocationId,
						removedQuantity: new Prisma.Decimal(override.removedQuantity),
					})),
					allocations: receiveAllocations(plan.line),
				},
			);

			rollOverRows.push(...rows);
			removedByLineId.set(
				plan.line.id,
				new Map(
					(removedLine?.allocations ?? []).map((allocation) => [
						allocation.cartItemId,
						new Prisma.Decimal(allocation.quantity),
					]),
				),
			);
		}

		await updateShipmentState(tx, record.id, { status: "received" });
		await updatePackageStatuses(
			tx,
			packages.map((pkg) => pkg.id),
			"received",
		);
		await updatePackageLineStatuses(
			tx,
			plans
				.filter((plan) => !plan.receivedQuantity.isZero())
				.map((plan) => plan.line.id),
			"received",
		);

		const closing = await closeReachableSupplierOrders(tx, {
			supplierOrderIds: Array.from(
				new Set(
					plans.flatMap((plan) =>
						plan.line.lotItem.lot.supplierOrderId === null
							? []
							: [plan.line.lotItem.lot.supplierOrderId],
					),
				),
			),
			final: input.final,
			finalReason: input.finalReason,
		});
		rollOverRows.push(...closing.rollOverRows);

		const createdRollOvers = await persistRollOvers(tx, rollOverRows);

		// One recompute per distinct operation: a shipment can carry lines from
		// several lots, and a roll over attaches to its own lot's operation.
		for (const operationId of new Set(
			rollOverRows.map((row) => row.operationId),
		)) {
			await recomputeOperationCounters(tx, operationId);
		}

		const effects = await sideEffects.onShipmentReceived(
			{ db: tx, actor, source: "shipment" },
			{
				shipmentId: record.id,
				shipmentInternalCode: record.internalCode,
				movedLines: receivedLines(plans, removedByLineId),
				createdRollOvers,
				// The record was loaded before the update, so this is the status the
				// shipment arrived in: a receipt after a delay clears the exception.
				resolvesException: record.status === "delayed",
			},
		);

		const after = await detailOf(tx, record.id, database);

		await writeAdminAuditLog(tx, {
			action: "shipment.receive",
			actor,
			entityType: SHIPMENT_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: {
				effects,
				final: input.final,
				finalReason: input.finalReason,
				closedSupplierOrderIds: closing.closedSupplierOrderIds,
				lines: plans.map((plan) => ({
					packageLotItemId: plan.line.id,
					lotItemCode: plan.line.lotItem.code,
					declaredQuantity: plan.line.quantity.toString(),
					receivedQuantity: plan.receivedQuantity.toString(),
					shortfall: plan.shortfall.toString(),
					reason: plan.reason,
				})),
			},
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

/**
 * `final` is a shipment-level flag that closes **supplier orders**: a shipment
 * carrying lines from two orders closes both, which is what an operator declaring
 * "this is the last delivery" means.
 *
 * The orders are re-read here, after the shortfall writes, so every remainder
 * reflects what actually arrived.
 */
async function closeReachableSupplierOrders(
	tx: Prisma.TransactionClient,
	input: {
		supplierOrderIds: number[];
		final: boolean;
		finalReason?: string;
	},
) {
	const rollOverRows: Array<PostAllocationRollOverInput & { cartId: number }> =
		[];
	const closedSupplierOrderIds: number[] = [];

	for (const supplierOrderId of input.supplierOrderIds) {
		const order = await findSupplierOrderForCommand(tx, supplierOrderId);
		if (!order) continue;

		const lines = order.lots.flatMap((lot) =>
			lot.lotItems
				.filter(
					(lotItem) =>
						lot.status !== "cancelled" && lotItem.status !== "cancelled",
				)
				.map((lotItem) => ({ lot, lotItem })),
		);

		if (input.final) {
			const remainders = lines.filter(({ lotItem }) =>
				remainingQuantity(lotItem).gt(zero()),
			);
			if (remainders.length > 0 && !input.finalReason) {
				throwConflict(
					"El cierre definitivo tiene cantidad sin despachar y necesita un motivo",
				);
			}

			for (const { lot, lotItem } of remainders) {
				const remainder = remainingQuantity(lotItem);
				const reductions = planCutAbsorption({
					candidates: lotItem.cartItemLotItems.map((allocation) => ({
						allocationId: allocation.id,
						cartItemId: allocation.cartItem.id,
						quantity: allocation.quantity,
						paidAt: resolveAllocationPaidAt(allocation.cartItem),
						orderItemCreatedAt: resolveAllocationOrderItemCreatedAt(
							allocation.cartItem,
						),
					})),
					cut: remainder,
				});

				const cartIdByAllocationId = new Map(
					lotItem.cartItemLotItems.map((allocation) => [
						allocation.id,
						allocation.cartItem.cart.id,
					]),
				);

				for (const reduction of reductions) {
					await updateAllocationQuantity(
						tx,
						reduction.allocationId,
						reduction.remainingQuantity,
					);
					rollOverRows.push({
						cartItemId: reduction.cartItemId,
						cartId: cartIdByAllocationId.get(reduction.allocationId) ?? 0,
						operationId: lot.operation.id,
						quantity: reduction.removedQuantity,
						reason: `Cierre definitivo de la orden ${order.code}: ${input.finalReason ?? ""}`,
					});
				}

				await updateLotItemState(tx, lotItem.id, {
					quantity: lotItem.quantity.minus(remainder),
				});
			}
		}

		// Every live line fully accounted for, and every live inbound package line of
		// the order already received. Otherwise the order stays `readyForReceipt`
		// waiting for the next dispatch.
		const nothingOutstanding =
			input.final ||
			lines.every(({ lotItem }) => remainingQuantity(lotItem).isZero());
		const everyPackageReceived = lines.every(({ lotItem }) =>
			lotItem.packageLotItems
				.filter(
					(packageLine) =>
						packageLine.package.leg === "inbound" &&
						packageLine.package.status !== "cancelled" &&
						packageLine.status !== "cancelled",
				)
				.every((packageLine) => packageLine.package.status === "received"),
		);

		if (lines.length === 0 || !nothingOutstanding || !everyPackageReceived) {
			continue;
		}

		await updateLotItemStatuses(
			tx,
			lines.map(({ lotItem }) => lotItem.id),
			"readyForPackaging",
		);
		await updateLotStatuses(
			tx,
			Array.from(new Set(lines.map(({ lot }) => lot.id))),
			"readyForPackaging",
		);
		await updateSupplierOrderState(tx, order.id, { status: "completed" });
		closedSupplierOrderIds.push(order.id);
	}

	return { rollOverRows, closedSupplierOrderIds };
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

/**
 * `markDelayed` and `markFailed` are the same command with a different target: a
 * delay is recoverable, a failure needs retry or write-off, and both publish the
 * exception per affected cart item. No quantity moves, so no counter recompute.
 */
async function markDisrupted(
	input: ShipmentExceptionInput,
	target: "delayed" | "failed",
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<ShipmentDetail> {
	const result = await database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);
		assertLegal(
			record.status,
			target,
			target === "delayed"
				? "Solo se puede demorar un envio en transito"
				: "El envio no se puede marcar como fallido",
		);

		const packages = liveCommandPackages(record);
		const before = await detailOf(tx, record.id, database);

		await updateShipmentState(tx, record.id, { status: target });
		await updatePackageStatuses(
			tx,
			packages.map((pkg) => pkg.id),
			target,
		);

		const effects = await sideEffects.onShipmentDisrupted(
			{ db: tx, actor, source: "shipment" },
			{
				shipmentId: record.id,
				shipmentInternalCode: record.internalCode,
				movedLines: toMovedLines(packages),
				reason: input.reason,
				exceptionStatus: target,
			},
		);

		const after = await detailOf(tx, record.id, database);

		await writeAdminAuditLog(tx, {
			action:
				target === "delayed" ? "shipment.markDelayed" : "shipment.markFailed",
			actor,
			entityType: SHIPMENT_ENTITY,
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
	input: ShipmentExceptionInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<ShipmentDetail> {
	return markDisrupted(input, "delayed", actor, database);
}

export async function markFailed(
	input: ShipmentExceptionInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<ShipmentDetail> {
	return markDisrupted(input, "failed", actor, database);
}

/**
 * A retry moves the surviving packages onto a **new** shipment, preserving their
 * identity (architecture §8). The failed shipment stays `failed` and emptied, as
 * history — it is never revived, which is why `shipmentTransitions` offers it only
 * `cancelled`.
 *
 * Returns the **new** shipment's detail, so the router output, the cache
 * invalidation and the client's selection must all follow the result id — the same
 * footgun `operation.rerun` carries (architecture §21.3).
 */
export async function retry(
	input: ShipmentRetryInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<ShipmentDetail> {
	const result = await database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);
		if (record.status !== "failed") {
			throwConflict("Solo se puede reintentar un envio fallido");
		}

		const packages = liveCommandPackages(record);
		if (packages.length === 0) {
			throwConflict("El envio fallido ya no tiene paquetes");
		}

		const before = await detailOf(tx, record.id, database);

		// The replacement reproduces the source's shape: a failed end-user delivery
		// must not come back as an internal transfer.
		const replacement = await createShipment(tx, {
			name: input.shipment.name,
			internalCode: input.shipment.internalCode,
			trackingCode: input.shipment.trackingCode,
			type: record.type,
			deliveryMode: record.deliveryMode ?? undefined,
			status: "readyForDispatch",
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

		const packageIds = packages.map((pkg) => pkg.id);
		await reassignPackagesToShipment(tx, packageIds, replacement.id);
		await updatePackageStatuses(tx, packageIds, "readyForShipment");
		await updatePackageLineStatuses(
			tx,
			packages.flatMap((pkg) => liveLines(pkg).map((line) => line.id)),
			"packed",
		);

		const effects = await sideEffects.onShipmentRetried(
			{ db: tx, actor, source: "shipment" },
			{
				shipmentId: record.id,
				shipmentInternalCode: record.internalCode,
				movedLines: toMovedLines(packages),
			},
		);

		const after = await detailOf(tx, replacement.id, database);

		await writeAdminAuditLog(tx, {
			action: "shipment.retry",
			actor,
			entityType: SHIPMENT_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: {
				effects,
				replacementShipmentId: replacement.id,
				replacementInternalCode: replacement.internalCode,
				packageIds,
			},
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

/** Carts the given assignment records' live allocations span. */
function distinctCartIds(records: PackageAssignmentRecord[]): Set<number> {
	return new Set(
		records.flatMap((pkg) =>
			pkg.packageLotItems
				.filter((line) => line.status !== "cancelled")
				.flatMap((line) =>
					line.packageAllocations.map(
						(allocation) => allocation.cartItemLotItem.cartItem.cartId,
					),
				),
		),
	);
}

/**
 * One definition of "this package can go on an end-user shipment", shared by
 * `createEndUser` and `addPackages` so the two can never disagree — the rule
 * Phases 3 and 4a both enforced for their own command pairs.
 *
 * A `homeDelivery` shipment must carry exactly one cart: `destinationAddressSnapshot`
 * is a single JSON blob, so one address means one customer. `pickupPoint` is
 * legitimately multi-customer, which is why the multi-customer package diagnostic
 * is only a warning there.
 */
async function loadAssignablePackages(
	tx: Prisma.TransactionClient,
	packageIds: number[],
	deliveryMode: DeliveryMode,
	alreadyOnShipment: PackageAssignmentRecord[] = [],
): Promise<PackageAssignmentRecord[]> {
	const records = await findPackagesForShipmentAssignment(tx, packageIds);
	if (records.length !== packageIds.length) {
		throwNotFound("Paquete");
	}

	for (const pkg of records) {
		if (pkg.leg !== "outbound") {
			throwConflict(`El paquete ${pkg.name} no es de salida`);
		}
		if (pkg.status !== "readyForShipment") {
			throwConflict(`El paquete ${pkg.name} no esta listo para envio`);
		}
		if (pkg.shipmentId !== null) {
			throwConflict(`El paquete ${pkg.name} ya esta en un envio`);
		}
	}

	if (deliveryMode === "homeDelivery") {
		const carts = distinctCartIds([...alreadyOnShipment, ...records]);
		if (carts.size > 1) {
			throwConflict("Un envio a domicilio debe ser de un unico cliente");
		}
	}

	return records;
}

/**
 * Builds an end-user delivery from packed outbound packages and assigns them to
 * it. Default isolation: the packages already exist and nothing moves quantity.
 *
 * Publishes **no** domain event — nothing moved. The departure fact comes from
 * `dispatch`.
 *
 * Returns the **new** shipment's detail, so the client must follow the result id
 * (the precedent `retry` and `operation.rerun` set).
 */
export async function createEndUser(
	input: ShipmentCreateEndUserInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<ShipmentDetail> {
	return database.$transaction(async (tx) => {
		const packages = await loadAssignablePackages(
			tx,
			input.packageIds,
			input.deliveryMode,
		);

		const shipment = await createShipment(tx, {
			name: input.name,
			internalCode: input.internalCode,
			trackingCode: input.trackingCode,
			type: "endUserDelivery",
			deliveryMode: input.deliveryMode,
			status: "readyForDispatch",
			destinationAddressSnapshot: input.destinationAddressSnapshot,
			destinationContactSnapshot: input.destinationContactSnapshot,
		}).catch((error: unknown) => {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throwConflict(
					`Ya existe un envio con el codigo interno ${input.internalCode}`,
				);
			}
			throw error;
		});

		const packageIds = packages.map((pkg) => pkg.id);
		await reassignPackagesToShipment(tx, packageIds, shipment.id);

		const after = await detailOf(tx, shipment.id, database);

		await writeAdminAuditLog(tx, {
			action: "shipment.createEndUser",
			actor,
			entityType: SHIPMENT_ENTITY,
			entityId: String(shipment.id),
			// No prior entity exists, so the change is stated by `after` plus the
			// packages the command claimed.
			before: null,
			after,
			metadata: { packageIds, deliveryMode: input.deliveryMode },
		});

		return after;
	});
}

/** The incremental half of `createEndUser`: more packages onto a shipment still being assembled. */
export async function addPackages(
	input: ShipmentAddPackagesInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<ShipmentDetail> {
	return database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);
		if (record.type !== "endUserDelivery") {
			throwConflict("Solo se pueden agregar paquetes a un envio al cliente");
		}
		if (record.deliveryMode === null) {
			throwConflict("El envio no tiene modo de entrega");
		}
		if (!dispatchableShipmentStatuses.has(record.status)) {
			throwConflict("El envio ya salio");
		}

		const existing = await findPackagesForShipmentAssignment(
			tx,
			liveCommandPackages(record).map((pkg) => pkg.id),
		);
		const packages = await loadAssignablePackages(
			tx,
			input.packageIds,
			record.deliveryMode,
			existing,
		);

		const before = await detailOf(tx, record.id, database);

		const packageIds = packages.map((pkg) => pkg.id);
		await reassignPackagesToShipment(tx, packageIds, record.id);

		const after = await detailOf(tx, record.id, database);

		await writeAdminAuditLog(tx, {
			action: "shipment.addPackages",
			actor,
			entityType: SHIPMENT_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: { packageIds },
		});

		return after;
	});
}

/**
 * The end-user counterpart of `receive`, and much smaller: no discrepancy, no
 * shortfall, no roll over, no counter recompute, no supplier-order closing. A
 * delivery discrepancy is composed from `package.split` + `markFailed` +
 * `writeOff`, all of which already exist.
 *
 * The two modes differ in exactly one way, and it is the reason the column
 * exists: a **home delivery** hands the goods over, so its packages cascade to
 * `received`; a **pickup point** arrival is not a handover, so its packages stay
 * `inTransit` until each customer collects (`package.confirmDelivery`). The
 * branch is written so the pickup-point path cannot reach the package cascade.
 */
export async function deliver(
	input: ShipmentDeliverInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<ShipmentDetail> {
	// Default isolation: a delivery moves statuses only, no quantity.
	const result = await database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);
		if (record.type !== "endUserDelivery") {
			throwConflict("Solo se puede entregar un envio al cliente");
		}
		assertLegal(record.status, "received", "El envio no se puede entregar");
		const deliveryMode = record.deliveryMode;
		if (deliveryMode === null) {
			throwConflict("El envio no tiene modo de entrega");
		}

		const packages = liveCommandPackages(record);
		if (packages.length === 0) {
			throwConflict("El envio no tiene paquetes activos");
		}

		const before = await detailOf(tx, record.id, database);
		const changeSet = {
			shipmentId: record.id,
			shipmentInternalCode: record.internalCode,
			movedLines: toMovedLines(packages),
			reason: input.notes,
			resolvesException: record.status === "delayed",
		};

		await updateShipmentState(tx, record.id, { status: "received" });

		const effects =
			deliveryMode === "homeDelivery"
				? await deliverToHome(tx, packages, actor, changeSet)
				: await sideEffects.onPickupPointArrived(
						{ db: tx, actor, source: "shipment" },
						changeSet,
					);

		const after = await detailOf(tx, record.id, database);

		await writeAdminAuditLog(tx, {
			action: "shipment.deliver",
			actor,
			entityType: SHIPMENT_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: {
				effects,
				deliveryMode,
				notes: input.notes,
				packageIds: packages.map((pkg) => pkg.id),
			},
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

/** Only reachable from the `homeDelivery` branch — the handover really happened. */
async function deliverToHome(
	tx: Prisma.TransactionClient,
	packages: CommandPackage[],
	actor: AdminMutationActor,
	changeSet: AdminShipmentChangeSet,
) {
	await updatePackageStatuses(
		tx,
		packages.map((pkg) => pkg.id),
		"received",
	);
	await updatePackageLineStatuses(
		tx,
		packages.flatMap((pkg) => liveLines(pkg).map((line) => line.id)),
		"received",
	);

	return sideEffects.onEndUserDelivered(
		{ db: tx, actor, source: "shipment" },
		changeSet,
	);
}
