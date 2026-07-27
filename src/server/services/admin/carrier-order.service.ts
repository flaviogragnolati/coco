/**
 * Carrier order commands. Deliberately the one fulfillment service that publishes
 * nothing to the event outbox and runs no effects handler (architecture §15 #10):
 * a booking records the contracting of transport, never the goods, so nothing a
 * customer can see derives from it. Mirroring the sibling services here — the
 * dispatcher wake-up, the operations effects call, an `AdminOperationsMutationSource`
 * entry — would put an unreachable event type back into the catalogue Phase 4b
 * emptied.
 */

import { Prisma } from "~/prisma/client";
import {
	carrierOrderDetailSchema,
	carrierOrderListOutputSchema,
	carrierOrderStatsSchema,
} from "~/schemas/admin/carrier-order.schemas";
import type { db } from "~/server/db";
import type {
	CarrierOrderAddShipmentsInput,
	CarrierOrderCommandInput,
	CarrierOrderCreateInput,
	CarrierOrderDeleteInput,
	CarrierOrderDetail,
	CarrierOrderListInput,
	CarrierOrderListItem,
	CarrierOrderReasonInput,
	CarrierOrderRemoveShipmentInput,
	CarrierOrderStats,
	CarrierOrderStatus,
	CarrierOrderUpdateInput,
} from "~/shared/common/admin-crud/carrier-order.types";
import {
	carrierOrderAvailableActions,
	carrierOrderTransitions,
	isLegalTransition,
} from "~/shared/common/fulfillment-transitions";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import {
	throwConflict,
	throwNotFound,
	throwRelationBlocked,
} from "./_base/admin-crud.errors";
import {
	type CarrierOrderDetailRecord,
	type CarrierOrderSummaryRecord,
	countCarrierOrderCandidates,
	createCarrierOrder,
	findCarrierOrderById,
	findCarrierOrderForCommand,
	getCarrierOrderStats,
	hardDeleteCarrierOrder,
	listCarrierOrderCandidates,
	setCarrierOrderDeleted,
	staleCarrierRequestThreshold,
	updateCarrierOrderFields,
	updateCarrierOrderState,
} from "./carrier-order.data";
import {
	type CarrierOrderDiagnosticsOptions,
	calculateCarrierOrderDiagnostics,
} from "./carrier-order-diagnostics";
import {
	DIAGNOSTIC_SCAN_LIMIT,
	diagnosticMessages,
	highestSeverity,
	resolveDiagnosticListPage,
} from "./operational-diagnostics.types";
import {
	findShipmentsForCarrierOrderAssignment,
	reassignShipmentsToCarrierOrder,
} from "./shipment.data";

type AdminDb = typeof db;

const CARRIER_ORDER_ENTITY = "carrier_order";
const CARRIER_ORDER_LABEL = "Orden de transporte";

const carrierOrderStatuses: CarrierOrderStatus[] = [
	"pending",
	"requested",
	"confirmed",
	"inTransit",
	"completed",
	"cancelled",
	"failed",
];

/**
 * One expression for both counts, so the action matrix and the command guards
 * can never disagree about what "has live shipments" means.
 */
function shipmentCounts(record: CarrierOrderSummaryRecord) {
	return {
		shipmentCount: record.shipments.length,
		liveShipmentCount: record.shipments.filter(
			(shipment) => shipment.status !== "cancelled",
		).length,
	};
}

function summarizeCarrierOrder(
	record: CarrierOrderSummaryRecord,
	options?: CarrierOrderDiagnosticsOptions,
): CarrierOrderListItem & {
	diagnostics: ReturnType<typeof calculateCarrierOrderDiagnostics>;
} {
	const diagnostics = calculateCarrierOrderDiagnostics(record, options);
	const counts = shipmentCounts(record);

	return {
		id: record.id,
		code: record.code,
		externalReference: record.externalReference,
		status: record.status,
		deleted: record.deleted,
		carrier: record.carrier,
		...counts,
		requestedAt: record.requestedAt,
		confirmedAt: record.confirmedAt,
		cancelledAt: record.cancelledAt,
		diagnosticCount: diagnostics.length,
		highestDiagnosticSeverity: highestSeverity(diagnostics),
		diagnosticMessages: diagnosticMessages(diagnostics),
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		availableActions: carrierOrderAvailableActions({
			status: record.status,
			deleted: record.deleted,
			...counts,
		}),
		diagnostics,
	};
}

function toDetail(
	record: CarrierOrderDetailRecord,
	options?: CarrierOrderDiagnosticsOptions,
): CarrierOrderDetail {
	const summary = summarizeCarrierOrder(record, options);

	return carrierOrderDetailSchema.parse({
		...summary,
		metadata: record.metadata ?? null,
		shipments: record.shipments.map((shipment) => ({
			id: shipment.id,
			internalCode: shipment.internalCode,
			name: shipment.name,
			type: shipment.type,
			deliveryMode: shipment.deliveryMode,
			status: shipment.status,
			trackingCode: shipment.trackingCode,
			packageCount: shipment._count.packages,
		})),
		diagnostics: summary.diagnostics,
	});
}

export async function list(input: CarrierOrderListInput, database: AdminDb) {
	const diagnosticOptions: CarrierOrderDiagnosticsOptions = {
		staleBefore: staleCarrierRequestThreshold(),
	};

	if (input.diagnosticState === "all") {
		const [total, records] = await Promise.all([
			countCarrierOrderCandidates(database, input),
			listCarrierOrderCandidates(database, input, {
				skip: (input.page - 1) * input.pageSize,
				take: input.pageSize,
			}),
		]);
		// `availableActions` stays on the list item — the table's row menu renders
		// from it. Only the diagnostics array is detail-only.
		const items = records
			.map((record) => summarizeCarrierOrder(record, diagnosticOptions))
			.map(({ diagnostics: _diagnostics, ...item }) => item);

		return carrierOrderListOutputSchema.parse({
			items,
			page: input.page,
			pageSize: input.pageSize,
			total,
			pageCount: total === 0 ? 0 : Math.ceil(total / input.pageSize),
			truncated: false,
		});
	}

	const records = await listCarrierOrderCandidates(database, input, {
		take: DIAGNOSTIC_SCAN_LIMIT,
	});
	const summarized = records
		.map((record) => summarizeCarrierOrder(record, diagnosticOptions))
		.map(({ diagnostics: _diagnostics, ...item }) => item);

	return carrierOrderListOutputSchema.parse(
		resolveDiagnosticListPage(summarized, input, records.length),
	);
}

export async function getById(id: number, database: AdminDb) {
	const record = await findCarrierOrderById(database, id);
	if (!record) throwNotFound(CARRIER_ORDER_LABEL);
	return toDetail(record, { staleBefore: staleCarrierRequestThreshold() });
}

export async function getStats(database: AdminDb): Promise<CarrierOrderStats> {
	const diagnosticOptions: CarrierOrderDiagnosticsOptions = {
		staleBefore: staleCarrierRequestThreshold(),
	};
	const [stats, scanRecords] = await Promise.all([
		getCarrierOrderStats(database),
		listCarrierOrderCandidates(
			database,
			{
				page: 1,
				pageSize: DIAGNOSTIC_SCAN_LIMIT,
				sortDirection: "desc",
				search: undefined,
				includeDeleted: false,
				diagnosticState: "all",
			},
			{ take: DIAGNOSTIC_SCAN_LIMIT },
		),
	]);

	const byStatusCounts = new Map(
		stats.byStatus.map((row) => [row.status, row._count._all]),
	);
	const byStatus = Object.fromEntries(
		carrierOrderStatuses.map((status) => [
			status,
			byStatusCounts.get(status) ?? 0,
		]),
	) as Record<CarrierOrderStatus, number>;

	const withDiagnostics = scanRecords
		.map((record) => summarizeCarrierOrder(record, diagnosticOptions))
		.filter((summary) => summary.diagnosticCount > 0).length;

	return carrierOrderStatsSchema.parse({
		total: stats.total,
		byStatus,
		shipmentCount: stats.shipmentCount,
		withDiagnostics,
		truncated: scanRecords.length >= DIAGNOSTIC_SCAN_LIMIT,
	});
}

async function loadForCommand(
	tx: Prisma.TransactionClient,
	id: number,
): Promise<CarrierOrderDetailRecord> {
	const record = await findCarrierOrderForCommand(tx, id);
	if (!record) throwNotFound(CARRIER_ORDER_LABEL);
	return record;
}

function assertNotDeleted(record: CarrierOrderDetailRecord) {
	if (record.deleted) {
		throwConflict("La orden de transporte esta dada de baja");
	}
}

async function detailOf(
	tx: Prisma.TransactionClient,
	id: number,
): Promise<CarrierOrderDetail> {
	return toDetail(await loadForCommand(tx, id));
}

/** The operator types JSON into a textarea; the schema only proves it parses. */
function parseMetadata(metadata: string | undefined): unknown {
	return metadata === undefined ? undefined : (JSON.parse(metadata) as unknown);
}

function duplicateCodeGuard(code: string) {
	return (error: unknown): never => {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throwConflict(`Ya existe una orden de transporte con el codigo ${code}`);
		}
		throw error;
	};
}

/**
 * One definition of "this shipment can join a booking", shared by `create` and
 * `addShipments` so the two can never disagree — the rule
 * `loadAssignablePackages` established for the shipment/package pair.
 *
 * Any non-cancelled status qualifies, `received` included: a carrier order is a
 * manual record often transcribed after the goods already moved.
 */
async function loadAssignableShipments(
	tx: Prisma.TransactionClient,
	shipmentIds: number[],
	orderId?: number,
) {
	const records = await findShipmentsForCarrierOrderAssignment(tx, shipmentIds);
	if (records.length !== shipmentIds.length) {
		throwNotFound("Envio");
	}

	for (const shipment of records) {
		if (shipment.status === "cancelled") {
			throwConflict(`El envio ${shipment.internalCode} esta cancelado`);
		}
		// Comparing against `orderId` rather than rejecting any non-null value makes
		// re-adding a shipment the booking already holds a harmless no-op. `create`
		// passes no id, so there every non-null owner is a conflict.
		if (
			shipment.carrierOrderId !== null &&
			shipment.carrierOrderId !== orderId
		) {
			throwConflict(
				`El envio ${shipment.internalCode} ya pertenece a otra orden de transporte`,
			);
		}
	}

	return records;
}

export async function create(
	input: CarrierOrderCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<CarrierOrderDetail> {
	return database.$transaction(async (tx) => {
		const shipments =
			input.shipmentIds.length > 0
				? await loadAssignableShipments(tx, input.shipmentIds)
				: [];

		const created = await createCarrierOrder(tx, {
			carrierId: input.carrierId,
			code: input.code,
			externalReference: input.externalReference,
			metadata: parseMetadata(input.metadata),
		}).catch(duplicateCodeGuard(input.code));

		const shipmentIds = shipments.map((shipment) => shipment.id);
		await reassignShipmentsToCarrierOrder(tx, shipmentIds, created.id);

		const after = await detailOf(tx, created.id);

		await writeAdminAuditLog(tx, {
			action: "carrierOrder.create",
			actor,
			entityType: CARRIER_ORDER_ENTITY,
			entityId: String(after.id),
			before: null,
			after,
			metadata: { shipmentIds },
		});

		return after;
	});
}

export async function update(
	input: CarrierOrderUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<CarrierOrderDetail> {
	return database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);
		assertNotDeleted(record);
		const before = toDetail(record);

		// The identity fields only: `status` moves through the ladder commands and a
		// timestamp is written by the command that owns it, never by an edit.
		await updateCarrierOrderFields(tx, input.id, {
			carrierId: input.carrierId,
			code: input.code,
			externalReference: input.externalReference,
			metadata: parseMetadata(input.metadata),
		}).catch(duplicateCodeGuard(input.code));

		const after = await detailOf(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "carrierOrder.update",
			actor,
			entityType: CARRIER_ORDER_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: CarrierOrderDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);
		if (record.deleted) {
			throwConflict("La orden de transporte ya esta dada de baja");
		}

		// Stricter than `carrier.softDelete`, which has no guard, and deliberately
		// so: a hidden row must never own live shipments — `shipment.carrierOrder`
		// would render a booking the list cannot show.
		if (shipmentCounts(record).liveShipmentCount > 0) {
			throwConflict(
				"Quita los envios de la orden antes de darla de baja (removeShipment)",
			);
		}

		const before = toDetail(record);
		await setCarrierOrderDeleted(tx, input.id, true);
		const after = await detailOf(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "carrierOrder.softDelete",
			actor,
			entityType: CARRIER_ORDER_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

/**
 * `Shipment.carrierOrderId` has no explicit `onDelete`, so Prisma's optional
 * relation default (`SetNull`) applies: the childless guard below is the only
 * thing standing between a purge and a silent unlink. Load-bearing, not cosmetic.
 */
export async function hardDelete(
	input: CarrierOrderDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);

		if (record.status !== "pending") {
			throwConflict(
				"Solo se puede eliminar definitivamente una orden de transporte pendiente",
			);
		}

		const { shipmentCount } = shipmentCounts(record);
		if (shipmentCount > 0) {
			throwRelationBlocked(
				`No se puede eliminar definitivamente "${record.code}" porque tiene ${shipmentCount} envio${shipmentCount === 1 ? "" : "s"} relacionado${shipmentCount === 1 ? "" : "s"}.`,
			);
		}

		const before = toDetail(record);

		// Written before the delete: the audit row must describe an entity that
		// still exists when it is read back (the `operation.remove` rule).
		await writeAdminAuditLog(tx, {
			action: "carrierOrder.hardDelete",
			actor,
			entityType: CARRIER_ORDER_ENTITY,
			entityId: String(record.id),
			before,
			metadata: { hardDelete: true },
		});

		const deleted = await hardDeleteCarrierOrder(tx, input.id);
		return { id: deleted.id };
	});
}

type LadderCommand = {
	target: CarrierOrderStatus;
	action: string;
	illegalMessage: string;
};

/**
 * Which timestamp column each rung owns. `inTransit`, `completed` and `failed`
 * have none — there is no column, and `updatedAt` plus the audit entry cover
 * them, the same call `Operation.cancelledAt` already made.
 */
const timestampFieldByTarget: Partial<
	Record<CarrierOrderStatus, "requestedAt" | "confirmedAt" | "cancelledAt">
> = {
	requested: "requestedAt",
	confirmed: "confirmedAt",
	cancelled: "cancelledAt",
};

/**
 * The six ladder commands are one implementation parameterized by target status,
 * the shape `markDisrupted` established. Default isolation on purpose: nothing
 * here moves quantity, so `runSerializable` must stay unused (architecture §24).
 */
async function moveStatus(
	input: { id: number; reason?: string },
	command: LadderCommand,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<CarrierOrderDetail> {
	return database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);
		assertNotDeleted(record);

		if (
			!isLegalTransition(carrierOrderTransitions, record.status, command.target)
		) {
			throwConflict(command.illegalMessage);
		}

		if (
			command.target === "inTransit" &&
			shipmentCounts(record).liveShipmentCount === 0
		) {
			throwConflict("La orden de transporte no tiene envios activos");
		}

		const before = toDetail(record);
		const timestampField = timestampFieldByTarget[command.target];
		const now = new Date();

		await updateCarrierOrderState(tx, record.id, {
			status: command.target,
			requestedAt: timestampField === "requestedAt" ? now : undefined,
			confirmedAt: timestampField === "confirmedAt" ? now : undefined,
			cancelledAt: timestampField === "cancelledAt" ? now : undefined,
		});

		const after = await detailOf(tx, record.id);

		await writeAdminAuditLog(tx, {
			action: command.action,
			actor,
			entityType: CARRIER_ORDER_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: { reason: input.reason },
		});

		return after;
	});
}

export async function request(
	input: CarrierOrderCommandInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<CarrierOrderDetail> {
	return moveStatus(
		input,
		{
			target: "requested",
			action: "carrierOrder.request",
			illegalMessage: "Solo se puede solicitar una orden pendiente",
		},
		actor,
		database,
	);
}

export async function confirm(
	input: CarrierOrderCommandInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<CarrierOrderDetail> {
	return moveStatus(
		input,
		{
			target: "confirmed",
			action: "carrierOrder.confirm",
			illegalMessage: "Solo se puede confirmar una orden solicitada",
		},
		actor,
		database,
	);
}

export async function markInTransit(
	input: CarrierOrderCommandInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<CarrierOrderDetail> {
	return moveStatus(
		input,
		{
			target: "inTransit",
			action: "carrierOrder.markInTransit",
			illegalMessage: "Solo se puede despachar una orden confirmada",
		},
		actor,
		database,
	);
}

export async function complete(
	input: CarrierOrderCommandInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<CarrierOrderDetail> {
	return moveStatus(
		input,
		{
			target: "completed",
			action: "carrierOrder.complete",
			illegalMessage: "Solo se puede completar una orden en transito",
		},
		actor,
		database,
	);
}

export async function cancel(
	input: CarrierOrderReasonInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<CarrierOrderDetail> {
	return moveStatus(
		input,
		{
			target: "cancelled",
			action: "carrierOrder.cancel",
			illegalMessage: "La orden de transporte ya no se puede cancelar",
		},
		actor,
		database,
	);
}

export async function markFailed(
	input: CarrierOrderReasonInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<CarrierOrderDetail> {
	return moveStatus(
		input,
		{
			target: "failed",
			action: "carrierOrder.markFailed",
			illegalMessage: "La orden de transporte no esta en curso",
		},
		actor,
		database,
	);
}

const closedCarrierOrderStatuses: ReadonlySet<CarrierOrderStatus> = new Set([
	"completed",
	"cancelled",
	"failed",
]);

function assertOpenForLinking(record: CarrierOrderDetailRecord) {
	if (closedCarrierOrderStatuses.has(record.status)) {
		throwConflict("La orden de transporte ya esta cerrada");
	}
}

export async function addShipments(
	input: CarrierOrderAddShipmentsInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<CarrierOrderDetail> {
	return database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);
		assertNotDeleted(record);
		assertOpenForLinking(record);

		const shipments = await loadAssignableShipments(
			tx,
			input.shipmentIds,
			record.id,
		);

		const before = toDetail(record);
		const shipmentIds = shipments.map((shipment) => shipment.id);
		await reassignShipmentsToCarrierOrder(tx, shipmentIds, record.id);

		const after = await detailOf(tx, record.id);

		await writeAdminAuditLog(tx, {
			action: "carrierOrder.addShipments",
			actor,
			entityType: CARRIER_ORDER_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: { shipmentIds },
		});

		return after;
	});
}

/**
 * Detaching says nothing about where the goods are, so the shipment's own status
 * is deliberately left alone.
 */
export async function removeShipment(
	input: CarrierOrderRemoveShipmentInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<CarrierOrderDetail> {
	return database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);
		assertNotDeleted(record);
		assertOpenForLinking(record);

		const attached = record.shipments.some(
			(shipment) => shipment.id === input.shipmentId,
		);
		if (!attached) {
			throwConflict("El envio no pertenece a esta orden de transporte");
		}

		const before = toDetail(record);
		await reassignShipmentsToCarrierOrder(tx, [input.shipmentId], null);

		const after = await detailOf(tx, record.id);

		await writeAdminAuditLog(tx, {
			action: "carrierOrder.removeShipment",
			actor,
			entityType: CARRIER_ORDER_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: { shipmentId: input.shipmentId },
		});

		return after;
	});
}
