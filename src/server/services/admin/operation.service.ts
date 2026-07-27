import type { Prisma } from "~/prisma/client";
import {
	operationDetailSchema,
	operationListOutputSchema,
	operationStatsSchema,
} from "~/schemas/admin/operation.schemas";
import type { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { writeAdminAuditLog } from "~/server/services/admin/_base/admin-audit";
import { recomputeOperationCounters } from "~/server/services/operations/operation-counters";
import {
	executeOperation,
	runOperationExecution,
} from "~/server/services/operations/operation-execution.service";
import type {
	OperationCancelInput,
	OperationCreateInput,
	OperationDeleteInput,
	OperationDetail,
	OperationListInput,
	OperationRerunInput,
	OperationStats,
} from "~/shared/common/admin-crud/operation.types";
import {
	AdminCrudError,
	throwConflict,
	throwNotFound,
} from "./_base/admin-crud.errors";
import { runSerializable } from "./_base/serializable-transaction";
import {
	applyOperationCompensation,
	countOperationCandidates,
	createRunningOperation,
	deleteOperation,
	findActiveDestination,
	findOperationById,
	findOperationForCommand,
	findStaleOpenRollOverThreshold,
	getOperationStats,
	listOperationCandidates,
	markOperationCancelled,
	markOperationFailed,
	type OperationCommandRecord,
	type OperationDetailRecord,
	type OperationSummaryRecord,
	toOperationDetail,
	toOperationListItem,
	updateOperationForRerun,
} from "./operation.data";
import { planOperationCompensation } from "./operation-compensation";
import {
	calculateOperationDiagnostics,
	type OperationDiagnosticsOptions,
} from "./operation-diagnostics";
import {
	DIAGNOSTIC_SCAN_LIMIT,
	resolveDiagnosticListPage,
} from "./operational-diagnostics.types";
import { AdminOperationsSideEffects } from "./operations-effects/operations-side-effects.service";

type AdminDb = typeof db;
type OperationTx = Prisma.TransactionClient;

const OPERATION_ENTITY = "operation";
const sideEffects = new AdminOperationsSideEffects();

function buildOperationCode() {
	return `OP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function errorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "Error tecnico desconocido";
}

function parseDetail(
	record: OperationDetailRecord,
	options?: OperationDiagnosticsOptions,
): OperationDetail {
	return operationDetailSchema.parse(
		toOperationDetail(record, calculateOperationDiagnostics(record, options)),
	);
}

function summarize(
	record: OperationSummaryRecord,
	options?: OperationDiagnosticsOptions,
) {
	return toOperationListItem(
		record,
		calculateOperationDiagnostics(record, options),
	);
}

export async function list(input: OperationListInput, database: AdminDb) {
	const diagnosticOptions: OperationDiagnosticsOptions = {
		staleOpenRollOverBefore: await findStaleOpenRollOverThreshold(database),
	};

	if (input.diagnosticState === "all") {
		const [total, records] = await Promise.all([
			countOperationCandidates(database, input),
			listOperationCandidates(database, input, {
				skip: (input.page - 1) * input.pageSize,
				take: input.pageSize,
			}),
		]);

		return operationListOutputSchema.parse({
			items: records.map((record) => summarize(record, diagnosticOptions)),
			page: input.page,
			pageSize: input.pageSize,
			total,
			pageCount: total === 0 ? 0 : Math.ceil(total / input.pageSize),
			truncated: false,
		});
	}

	const records = await listOperationCandidates(database, input, {
		take: DIAGNOSTIC_SCAN_LIMIT,
	});

	return operationListOutputSchema.parse(
		resolveDiagnosticListPage(
			records.map((record) => summarize(record, diagnosticOptions)),
			input,
			records.length,
		),
	);
}

export async function getById(id: number, database: AdminDb) {
	const record = await findOperationById(database, id);
	if (!record) throwNotFound("Operacion");

	return parseDetail(record, {
		staleOpenRollOverBefore: await findStaleOpenRollOverThreshold(database),
	});
}

export async function getStats(database: AdminDb): Promise<OperationStats> {
	return operationStatsSchema.parse(await getOperationStats(database));
}

export async function createAndExecute(
	input: OperationCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	const destination = await findActiveDestination(
		database,
		input.destinationId,
	);
	if (!destination) {
		throw new AdminCrudError(
			"CONFLICT",
			"El destino seleccionado no existe, esta inactivo o fue eliminado",
		);
	}

	const operation = await createRunningOperation(database, {
		...input,
		code: buildOperationCode(),
		triggeredByUserId: actor.id,
	});

	try {
		await executeOperation(database, {
			operationId: operation.id,
			actor,
		});
	} catch (error) {
		const failed = parseDetail(
			await markOperationFailed(database, {
				id: operation.id,
				failureReason: errorMessage(error),
			}),
		);

		await database.$transaction(async (tx) => {
			await writeAdminAuditLog(tx, {
				action: "operation.createAndExecute.failed",
				actor,
				entityType: OPERATION_ENTITY,
				entityId: String(operation.id),
				after: failed,
				metadata: {
					failureReason: failed.failureReason,
				},
			});
		});

		throw new AdminCrudError(
			"CONFLICT",
			`No se pudo ejecutar la operacion ${operation.code}: ${failed.failureReason}`,
		);
	}

	await DomainEventDispatcher.wake();

	const detail = await findOperationById(database, operation.id);
	if (!detail) throwNotFound("Operacion");
	const parsed = parseDetail(detail);

	await database.$transaction(async (tx) => {
		await writeAdminAuditLog(tx, {
			action: "operation.createAndExecute",
			actor,
			entityType: OPERATION_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
			metadata: {
				destinationId: destination.id,
				destinationName: destination.name,
				eligibleQuantity: parsed.eligibleQuantity,
				assignedQuantity: parsed.assignedQuantity,
				rollOverQuantity: parsed.rollOverQuantity,
			},
		});
	});

	return parsed;
}

async function loadForCommand(
	tx: OperationTx,
	id: number,
): Promise<OperationCommandRecord> {
	const record = await findOperationForCommand(tx, id);
	if (!record) throwNotFound("Operacion");
	return record;
}

async function loadDetail(
	tx: OperationTx,
	id: number,
): Promise<OperationDetail> {
	const record = await findOperationById(tx, id);
	if (!record) throwNotFound("Operacion");
	return parseDetail(record);
}

/**
 * The status-only compensation shared by `cancel` and by `rerun` from a
 * `completed` source (architecture §8). Nothing is deleted and no quantity is
 * touched: lots, lines and supplier orders go `cancelled`, the roll overs this
 * operation created go `cancelled`, and the ones it consumed return to `open`
 * so their demand re-enters aggregation (ADR 0005).
 */
async function compensate(
	tx: OperationTx,
	record: OperationCommandRecord,
	actor: AdminMutationActor,
	reason: string,
) {
	if (record.status !== "completed") {
		throwConflict("Solo se puede compensar una operacion completada");
	}

	const plan = planOperationCompensation(record);

	await applyOperationCompensation(tx, {
		operationId: record.id,
		lotIds: plan.lotIds,
		lotItemIds: plan.lotItemIds,
		supplierOrderIds: plan.supplierOrderIds,
		createdRollOverIds: plan.createdRollOverIds,
	});

	await recomputeOperationCounters(tx, record.id);
	await markOperationCancelled(tx, record.id);

	const effects = await sideEffects.onOperationCompensated(
		{ db: tx, actor, source: "operation" },
		{
			operationId: record.id,
			operationCode: record.code,
			reason,
			excludedCartItems: plan.affectedCartItems,
		},
	);

	return { plan, effects };
}

export async function cancel(
	input: OperationCancelInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<OperationDetail> {
	const result = await runSerializable(database, async (tx) => {
		const record = await loadForCommand(tx, input.id);
		const before = await loadDetail(tx, record.id);

		const { plan, effects } = await compensate(tx, record, actor, input.reason);

		const after = await loadDetail(tx, record.id);

		await writeAdminAuditLog(tx, {
			action: "operation.cancel",
			actor,
			entityType: OPERATION_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: {
				effects,
				reason: input.reason,
				cancelledLotIds: plan.lotIds,
				cancelledLotItemIds: plan.lotItemIds,
				cancelledSupplierOrderIds: plan.supplierOrderIds,
				cancelledRollOverIds: plan.createdRollOverIds,
				excludedCartItems: plan.affectedCartItems,
			},
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

/**
 * Execution failures inside a compound command must surface as CONFLICT, not as
 * a raw Prisma/technical error. Unlike `createAndExecute` no `failed` row is
 * left behind: the throw rolls the whole transaction back, compensation included.
 */
async function executeInside(
	tx: OperationTx,
	input: { operationId: number; actor: AdminMutationActor; code: string },
) {
	try {
		await runOperationExecution(tx, {
			operationId: input.operationId,
			actor: input.actor,
		});
	} catch (error) {
		if (error instanceof AdminCrudError) throw error;
		throw new AdminCrudError(
			"CONFLICT",
			`No se pudo ejecutar la operacion ${input.code}: ${errorMessage(error)}`,
		);
	}
}

export async function rerun(
	input: OperationRerunInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<OperationDetail> {
	const { id, reason, ...parameters } = input;

	const result = await runSerializable(database, async (tx) => {
		const destination = await findActiveDestination(
			tx,
			parameters.destinationId,
		);
		if (!destination) {
			throw new AdminCrudError(
				"CONFLICT",
				"El destino seleccionado no existe, esta inactivo o fue eliminado",
			);
		}

		const record = await loadForCommand(tx, id);
		const before = await loadDetail(tx, record.id);
		const compensationReason =
			reason ?? `Reejecucion de la operacion ${record.code}`;

		let resultOperationId = record.id;
		let compensated = false;

		if (record.status === "failed") {
			// The failed run's transaction rolled back, so re-executing the same row
			// cannot collide on event keys — unless it left outputs behind, which
			// `operation.failed.withOutputs` exists to surface.
			if (record.lots.length > 0 || record.rollOvers.length > 0) {
				throwConflict(
					"La operacion fallida dejo lotes o rollovers; no se puede reejecutar en el lugar",
				);
			}

			await updateOperationForRerun(tx, { id: record.id, ...parameters });
			await executeInside(tx, {
				operationId: record.id,
				actor,
				code: record.code,
			});
		} else if (record.status === "completed" || record.status === "cancelled") {
			if (record.status === "completed") {
				await compensate(tx, record, actor, compensationReason);
				compensated = true;
			}

			const created = await createRunningOperation(tx, {
				...parameters,
				code: buildOperationCode(),
				triggeredByUserId: actor.id,
			});
			resultOperationId = created.id;

			await executeInside(tx, {
				operationId: created.id,
				actor,
				code: created.code,
			});
		} else {
			throwConflict("Una operacion en ejecucion no admite comandos");
		}

		const after = await loadDetail(tx, resultOperationId);

		await writeAdminAuditLog(tx, {
			action: "operation.rerun",
			actor,
			entityType: OPERATION_ENTITY,
			entityId: String(record.id),
			before,
			after,
			metadata: {
				sourceOperationId: record.id,
				sourceStatus: record.status,
				resultOperationId,
				compensated,
				reason: compensationReason,
				destinationId: destination.id,
				destinationName: destination.name,
			},
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}

export async function remove(
	input: OperationDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<{ id: number }> {
	return database.$transaction(async (tx) => {
		const record = await loadForCommand(tx, input.id);

		if (record.status !== "failed") {
			throwConflict("Solo se puede eliminar una operacion fallida");
		}
		// `Lot.operationId` is `onDelete: Restrict`, so the database would refuse
		// anyway; the guard exists to produce a readable message instead of a raw
		// foreign-key error.
		if (record.lots.length > 0 || record.rollOvers.length > 0) {
			throwConflict(
				"La operacion tiene lotes o rollovers asociados; no se puede eliminar",
			);
		}

		const before = await loadDetail(tx, record.id);

		await writeAdminAuditLog(tx, {
			action: "operation.remove",
			actor,
			entityType: OPERATION_ENTITY,
			entityId: String(record.id),
			before,
			metadata: { code: record.code, failureReason: before.failureReason },
		});

		await deleteOperation(tx, record.id);

		return { id: record.id };
	});
}
