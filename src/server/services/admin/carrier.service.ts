import {
	carrierDetailSchema,
	carrierListOutputSchema,
	carrierStatsSchema,
} from "~/schemas/admin/carrier.schemas";
import type { db } from "~/server/db";
import type {
	CarrierCreateInput,
	CarrierDeleteInput,
	CarrierDetail,
	CarrierListInput,
	CarrierStats,
	CarrierUpdateInput,
} from "~/shared/common/admin-crud/carrier.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	type CarrierDetailRecord,
	type CarrierRelationCountRecord,
	createCarrier,
	findCarrierById,
	getCarrierRelationCounts,
	getCarrierStats,
	hardDeleteCarrier,
	listCarriers,
	softDeleteCarrier,
	updateCarrier,
} from "./carrier.data";

type AdminDb = typeof db;

const CARRIER_ENTITY = "carrier";

function parseDetail(record: CarrierDetailRecord): CarrierDetail {
	return carrierDetailSchema.parse(record);
}

function buildRelationBlockMessage(record: CarrierRelationCountRecord) {
	const carrierOrderCount = record._count.carrierOrders;
	return `No se puede eliminar definitivamente "${record.name}" porque tiene ${carrierOrderCount} orden${carrierOrderCount === 1 ? "" : "es"} de carrier relacionada${carrierOrderCount === 1 ? "" : "s"}.`;
}

export async function list(input: CarrierListInput, database: AdminDb) {
	const records = await listCarriers(database, input);
	return carrierListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const carrier = await findCarrierById(database, id);
	if (!carrier) throwNotFound("Carrier");
	return parseDetail(carrier);
}

export async function getStats(database: AdminDb): Promise<CarrierStats> {
	return carrierStatsSchema.parse(await getCarrierStats(database));
}

export async function create(
	input: CarrierCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const carrier = await createCarrier(tx, input);
		const parsed = parseDetail(carrier);

		await writeAdminAuditLog(tx, {
			action: "carrier.create",
			actor,
			entityType: CARRIER_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
		});

		return parsed;
	});
}

export async function update(
	input: CarrierUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findCarrierById(tx, input.id);
		if (!beforeRecord) throwNotFound("Carrier");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar un carrier eliminado",
			);
		}

		const carrier = await updateCarrier(tx, input);
		const after = parseDetail(carrier);

		await writeAdminAuditLog(tx, {
			action: "carrier.update",
			actor,
			entityType: CARRIER_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: CarrierDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findCarrierById(tx, input.id);
		if (!beforeRecord) throwNotFound("Carrier");
		const before = parseDetail(beforeRecord);

		const carrier = await softDeleteCarrier(tx, input.id);
		const after = parseDetail(carrier);

		await writeAdminAuditLog(tx, {
			action: "carrier.softDelete",
			actor,
			entityType: CARRIER_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: CarrierDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const carrier = await getCarrierRelationCounts(tx, input.id);
		if (!carrier) throwNotFound("Carrier");

		if (carrier._count.carrierOrders > 0) {
			throw new AdminCrudError(
				"RELATION_BLOCKED",
				buildRelationBlockMessage(carrier),
			);
		}

		const before = parseDetail(carrier);
		const deleted = await hardDeleteCarrier(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "carrier.hardDelete",
			actor,
			entityType: CARRIER_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
