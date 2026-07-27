import type { Prisma } from "~/prisma/client";
import {
	operationDetailSchema,
	operationListOutputSchema,
	operationReviewOutputSchema,
	operationReviewStateSchema,
	operationStatsSchema,
} from "~/schemas/admin/operation.schemas";
import type { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { writeAdminAuditLog } from "~/server/services/admin/_base/admin-audit";
import { recomputeOperationCounters } from "~/server/services/operations/operation-counters";
import {
	buildDemand,
	DemandChangedError,
	resolveAssignments,
	runOperationExecution,
	summarizeSupplierGroups,
	validateOperation,
} from "~/server/services/operations/operation-execution.service";
import {
	applyOmissions,
	buildReviewProjection,
	emptyOmissions,
	pruneOmissions,
} from "~/server/services/operations/operation-review";
import type {
	OperationCancelInput,
	OperationCreateInput,
	OperationDeleteInput,
	OperationDetail,
	OperationDraftCreateInput,
	OperationDraftUpdateInput,
	OperationExecuteInput,
	OperationListInput,
	OperationOmissions,
	OperationRerunInput,
	OperationReviewOutput,
	OperationReviewState,
	OperationStats,
} from "~/shared/common/admin-crud/operation.types";
import { fromDateTimeLocalValue } from "~/shared/common/date.helpers";
import {
	AdminCrudError,
	throwConflict,
	throwNotFound,
} from "./_base/admin-crud.errors";
import { runSerializable } from "./_base/serializable-transaction";
import {
	applyOperationCompensation,
	countOperationCandidates,
	createDraftOperation,
	createRunningOperation,
	deleteOperation,
	findActiveDestination,
	findDraftForExecution,
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
	staleDraftThreshold,
	toOperationDetail,
	toOperationListItem,
	updateDraftOperation,
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
		// Pure and per-request, never per row.
		staleDraftBefore: staleDraftThreshold(),
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
		staleDraftBefore: staleDraftThreshold(),
	});
}

export async function getStats(database: AdminDb): Promise<OperationStats> {
	return operationStatsSchema.parse(await getOperationStats(database));
}

async function requireActiveDestination(
	db: OperationTx,
	destinationId: number,
) {
	const destination = await findActiveDestination(db, destinationId);
	if (!destination) {
		throw new AdminCrudError(
			"CONFLICT",
			"El destino seleccionado no existe, esta inactivo o fue eliminado",
		);
	}
	return destination;
}

type DraftRecord = NonNullable<
	Awaited<ReturnType<typeof findDraftForExecution>>
>;

async function loadDraft(db: OperationTx, id: number): Promise<DraftRecord> {
	const record = await findDraftForExecution(db, id);
	if (!record) throwNotFound("Operacion");
	if (record.status !== "draft") {
		throwConflict("Solo se puede revisar o ejecutar un borrador");
	}
	return record;
}

/**
 * A draft written before a `reviewState` shape change, or one whose column is
 * null, degrades to "nothing omitted" rather than failing the review. Losing an
 * omission is visible in the dialog; refusing to open it is not recoverable.
 */
function readReviewState(value: unknown): OperationReviewState {
	const parsed = operationReviewStateSchema.safeParse(value);
	return parsed.success ? parsed.data : { omissions: { ...emptyOmissions } };
}

/**
 * The read-only prefix of the execution pipeline, run through the very functions
 * the command runs. Writes nothing — pruning orphaned omissions is `updateDraft`'s
 * job, not the query's.
 */
async function computeReview(
	db: OperationTx,
	draft: DraftRecord,
	omissions: OperationOmissions,
) {
	const operation = await validateOperation(db, draft.id);
	if (operation.destinationId === null) {
		throwConflict("La operacion no tiene destino asignado");
	}

	const items = await buildDemand(db, operation);
	const resolved = resolveAssignments(items, new Date());
	const { effective } = applyOmissions(items, omissions);

	return buildReviewProjection({
		items,
		omissions,
		resolved,
		supplierGroups: summarizeSupplierGroups({
			operationId: operation.id,
			destinationId: operation.destinationId,
			// Only the effective set produces lots; omitted demand materializes
			// nothing at all (ADR 0006).
			assignments: resolved.assignments.filter((assignment) =>
				effective.some(
					(item) => item.sourceKey === assignment.demand.sourceKey,
				),
			),
		}),
	});
}

async function buildReviewOutput(
	db: OperationTx,
	draft: DraftRecord,
	input: { omissions: OperationOmissions; prunedOmissions: OperationOmissions },
): Promise<OperationReviewOutput> {
	const projection = await computeReview(db, draft, input.omissions);
	const detail = await findOperationById(db, draft.id);
	if (!detail) throwNotFound("Operacion");

	return operationReviewOutputSchema.parse({
		operation: parseDetail(detail),
		fingerprint: projection.fingerprint,
		rows: projection.rows,
		groups: projection.groups,
		totals: projection.totals,
		omissions: input.omissions,
		prunedOmissions: input.prunedOmissions,
	});
}

export async function createDraft(
	input: OperationDraftCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<OperationDetail> {
	const destination = await requireActiveDestination(
		database,
		input.destinationId,
	);

	// No `runSerializable` and no dispatcher wake: a draft moves no quantity and
	// publishes nothing.
	const operation = await createDraftOperation(database, {
		...input,
		code: buildOperationCode(),
		triggeredByUserId: actor.id,
	});

	const detail = await findOperationById(database, operation.id);
	if (!detail) throwNotFound("Operacion");
	const parsed = parseDetail(detail);

	await database.$transaction(async (tx) => {
		await writeAdminAuditLog(tx, {
			action: "operation.createDraft",
			actor,
			entityType: OPERATION_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
			metadata: {
				destinationId: destination.id,
				destinationName: destination.name,
			},
		});
	});

	return parsed;
}

export async function review(
	id: number,
	database: AdminDb,
): Promise<OperationReviewOutput> {
	const draft = await loadDraft(database, id);
	const { omissions } = readReviewState(draft.reviewState);

	return buildReviewOutput(database, draft, {
		omissions,
		prunedOmissions: { ...emptyOmissions },
	});
}

export async function updateDraft(
	input: OperationDraftUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<OperationReviewOutput> {
	const { id, omissions: incomingOmissions, ...parameters } = input;

	return database.$transaction(async (tx) => {
		const draft = await loadDraft(tx, id);
		const before = await loadDetail(tx, draft.id);

		if (parameters.destinationId !== undefined) {
			await requireActiveDestination(tx, parameters.destinationId);
		}

		// The schema can only check a window sent whole; a half-sent one is only
		// meaningful against the parameters already on the draft.
		const from = parameters.from
			? fromDateTimeLocalValue(parameters.from)
			: draft.from;
		const to = parameters.to ? fromDateTimeLocalValue(parameters.to) : draft.to;
		if (to < from) {
			throwConflict("La fecha hasta no puede ser anterior a la fecha desde");
		}

		const requested =
			incomingOmissions ?? readReviewState(draft.reviewState).omissions;

		// Parameters first: pruning against the pre-edit demand set would drop
		// omissions the new window still covers, and keep ones it no longer does.
		await updateDraftOperation(tx, {
			id: draft.id,
			parameters,
			reviewState: { omissions: requested },
		});

		const updated = await loadDraft(tx, draft.id);
		const operation = await validateOperation(tx, updated.id);
		const pruned = pruneOmissions(await buildDemand(tx, operation), requested);

		await updateDraftOperation(tx, {
			id: draft.id,
			reviewState: { omissions: pruned.omissions },
		});

		const output = await buildReviewOutput(tx, await loadDraft(tx, draft.id), {
			omissions: pruned.omissions,
			prunedOmissions: {
				sourceKeys: pruned.droppedSourceKeys,
				userIds: pruned.droppedUserIds,
			},
		});

		await writeAdminAuditLog(tx, {
			action: "operation.updateDraft",
			actor,
			entityType: OPERATION_ENTITY,
			entityId: String(draft.id),
			before,
			after: output.operation,
			metadata: {
				omittedSourceKeyCount: pruned.omissions.sourceKeys.length,
				omittedUserCount: pruned.omissions.userIds.length,
				droppedSourceKeys: pruned.droppedSourceKeys,
				droppedUserIds: pruned.droppedUserIds,
			},
		});

		return output;
	});
}

/**
 * Which audit actions an execution writes. The two entry points differ only in
 * this: `createAndExecute` keeps the action names its history is already recorded
 * under, so the scripted path stays greppable across the change.
 */
type ExecutionAudit = { action: string; failedAction: string };

const executeAudit: ExecutionAudit = {
	action: "operation.execute",
	failedAction: "operation.execute.failed",
};

const createAndExecuteAudit: ExecutionAudit = {
	action: "operation.createAndExecute",
	failedAction: "operation.createAndExecute.failed",
};

export async function execute(
	input: OperationExecuteInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<OperationDetail> {
	return runDraftExecution(input, actor, database, executeAudit);
}

async function runDraftExecution(
	input: OperationExecuteInput,
	actor: AdminMutationActor,
	database: AdminDb,
	audit: ExecutionAudit,
): Promise<OperationDetail> {
	let code = "";

	try {
		const result = await runSerializable(database, async (tx) => {
			const draft = await loadDraft(tx, input.id);
			code = draft.code;
			const state = readReviewState(draft.reviewState);

			await runOperationExecution(tx, {
				operationId: draft.id,
				actor,
				omissions: state.omissions,
				expectedFingerprint: input.fingerprint,
			});

			const after = await loadDetail(tx, draft.id);

			await updateDraftOperation(tx, {
				id: draft.id,
				reviewState: {
					omissions: state.omissions,
					// The durable record of the demand set a human approved (ADR 0006).
					approved: {
						fingerprint: input.fingerprint,
						itemCount: after.eligibleItemCount,
						quantity: after.eligibleQuantity,
						at: new Date().toISOString(),
						byUserId: actor.id,
					},
				},
			});

			await writeAdminAuditLog(tx, {
				action: audit.action,
				actor,
				entityType: OPERATION_ENTITY,
				entityId: String(draft.id),
				after,
				metadata: {
					fingerprint: input.fingerprint,
					omittedSourceKeyCount: state.omissions.sourceKeys.length,
					omittedUserCount: state.omissions.userIds.length,
					eligibleQuantity: after.eligibleQuantity,
					assignedQuantity: after.assignedQuantity,
					rollOverQuantity: after.rollOverQuantity,
				},
			});

			return after;
		});

		await DomainEventDispatcher.wake();
		return result;
	} catch (error) {
		// A moved demand set is a retryable review conflict, not an execution
		// failure: the transaction rolled back, so the row is still a `draft` and
		// must not be marked `failed` (ADR 0006).
		if (error instanceof DemandChangedError) {
			throw new AdminCrudError(
				"CONFLICT",
				`La demanda cambió desde la revisión: ahora hay ${error.itemCount} ítem(s) por ${error.quantity}. Revisá de nuevo antes de ejecutar.`,
			);
		}
		if (error instanceof AdminCrudError) throw error;

		return failExecution(database, {
			id: input.id,
			code,
			actor,
			error,
			action: audit.failedAction,
		});
	}
}

/**
 * Mirrors `createAndExecute`'s technical-failure path: the transaction already
 * rolled back, so the `failed` mark is written outside it and the caller sees a
 * CONFLICT carrying the reason.
 */
async function failExecution(
	database: AdminDb,
	input: {
		id: number;
		code: string;
		actor: AdminMutationActor;
		error: unknown;
		action: string;
	},
): Promise<never> {
	const failed = parseDetail(
		await markOperationFailed(database, {
			id: input.id,
			failureReason: errorMessage(input.error),
		}),
	);

	await database.$transaction(async (tx) => {
		await writeAdminAuditLog(tx, {
			action: input.action,
			actor: input.actor,
			entityType: OPERATION_ENTITY,
			entityId: String(input.id),
			after: failed,
			metadata: { failureReason: failed.failureReason },
		});
	});

	throw new AdminCrudError(
		"CONFLICT",
		`No se pudo ejecutar la operacion ${input.code}: ${failed.failureReason}`,
	);
}

/**
 * The no-review path, kept for scripted use — `scripts/fulfillment-e2e.ts` is its
 * only caller. A wrapper rather than a second implementation, so there stays
 * exactly one code path that materializes lots, lot items and allocations: it
 * creates the draft, takes the fingerprint of the demand it just computed, and
 * executes against it.
 */
export async function createAndExecute(
	input: OperationCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<OperationDetail> {
	const draft = await createDraft(input, actor, database);

	let fingerprint: string;
	try {
		fingerprint = (await review(draft.id, database)).fingerprint;
	} catch (error) {
		// `validateOperation` throws plain Errors. Without this the wrapper would
		// leak one raw and leave a `draft` row behind, where the one-step path has
		// always produced a CONFLICT over a `failed` one.
		if (error instanceof AdminCrudError) throw error;
		return failExecution(database, {
			id: draft.id,
			code: draft.code,
			actor,
			error,
			action: createAndExecuteAudit.failedAction,
		});
	}

	return runDraftExecution(
		{ id: draft.id, fingerprint },
		actor,
		database,
		createAndExecuteAudit,
	);
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

		// Discarding a draft is the same act: the row goes away and, having
		// materialized nothing, it leaves nothing behind (ADR 0006).
		if (record.status !== "failed" && record.status !== "draft") {
			throwConflict(
				"Solo se puede eliminar una operacion fallida o descartar un borrador",
			);
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
