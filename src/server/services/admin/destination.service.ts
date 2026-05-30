import {
	destinationDetailSchema,
	destinationListOutputSchema,
	destinationStatsSchema,
} from "~/schemas/admin/destination.schemas";
import type { db } from "~/server/db";
import type {
	DestinationCreateInput,
	DestinationDeleteInput,
	DestinationDetail,
	DestinationListInput,
	DestinationStats,
	DestinationUpdateInput,
} from "~/shared/common/admin-crud/destination.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	createDestination,
	type DestinationDetailRecord,
	type DestinationRelationCountRecord,
	findDestinationById,
	getDestinationRelationCounts,
	getDestinationStats,
	hardDeleteDestination,
	listDestinations,
	softDeleteDestination,
	updateDestination,
} from "./destination.data";

type AdminDb = typeof db;

const DESTINATION_ENTITY = "destination";

function parseDetail(record: DestinationDetailRecord): DestinationDetail {
	return destinationDetailSchema.parse(record);
}

function buildRelationBlockMessage(record: DestinationRelationCountRecord) {
	const lotItemCount = record._count.lotItems;
	return `No se puede eliminar definitivamente "${record.name}" porque tiene ${lotItemCount} item${lotItemCount === 1 ? "" : "s"} de lote relacionado${lotItemCount === 1 ? "" : "s"}.`;
}

export async function list(input: DestinationListInput, database: AdminDb) {
	const records = await listDestinations(database, input);
	return destinationListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const destination = await findDestinationById(database, id);
	if (!destination) throwNotFound("Destino");
	return parseDetail(destination);
}

export async function getStats(database: AdminDb): Promise<DestinationStats> {
	return destinationStatsSchema.parse(await getDestinationStats(database));
}

export async function create(
	input: DestinationCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const destination = await createDestination(tx, input);
		const parsed = parseDetail(destination);

		await writeAdminAuditLog(tx, {
			action: "destination.create",
			actor,
			entityType: DESTINATION_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
		});

		return parsed;
	});
}

export async function update(
	input: DestinationUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findDestinationById(tx, input.id);
		if (!beforeRecord) throwNotFound("Destino");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar un destino eliminado",
			);
		}

		const destination = await updateDestination(tx, input);
		const after = parseDetail(destination);

		await writeAdminAuditLog(tx, {
			action: "destination.update",
			actor,
			entityType: DESTINATION_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: DestinationDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findDestinationById(tx, input.id);
		if (!beforeRecord) throwNotFound("Destino");
		const before = parseDetail(beforeRecord);

		const destination = await softDeleteDestination(tx, input.id);
		const after = parseDetail(destination);

		await writeAdminAuditLog(tx, {
			action: "destination.softDelete",
			actor,
			entityType: DESTINATION_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: DestinationDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const destination = await getDestinationRelationCounts(tx, input.id);
		if (!destination) throwNotFound("Destino");

		if (destination._count.lotItems > 0) {
			throw new AdminCrudError(
				"RELATION_BLOCKED",
				buildRelationBlockMessage(destination),
			);
		}

		const before = parseDetail(destination);
		const deleted = await hardDeleteDestination(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "destination.hardDelete",
			actor,
			entityType: DESTINATION_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
