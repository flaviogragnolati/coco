import {
	operationDetailSchema,
	operationListOutputSchema,
	operationStatsSchema,
} from "~/schemas/admin/operation.schemas";
import type { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { writeAdminAuditLog } from "~/server/services/admin/_base/admin-audit";
import { executeOperation } from "~/server/services/operations/operation-execution.service";
import type {
	OperationCreateInput,
	OperationDetail,
	OperationListInput,
	OperationStats,
} from "~/shared/common/admin-crud/operation.types";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	createRunningOperation,
	findActiveDestination,
	findOperationById,
	getOperationStats,
	listOperations,
	markOperationFailed,
} from "./operation.data";

type AdminDb = typeof db;

const OPERATION_ENTITY = "operation";

function buildOperationCode() {
	return `OP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function errorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "Error tecnico desconocido";
}

function parseDetail(record: unknown): OperationDetail {
	return operationDetailSchema.parse(record);
}

export async function list(input: OperationListInput, database: AdminDb) {
	const records = await listOperations(database, input);
	return operationListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const operation = await findOperationById(database, id);
	if (!operation) throwNotFound("Operacion");
	return parseDetail(operation);
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
