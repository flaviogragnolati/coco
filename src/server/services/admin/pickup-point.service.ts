import {
	pickupPointDetailSchema,
	pickupPointListOutputSchema,
	pickupPointStatsSchema,
} from "~/schemas/admin/pickup-point.schemas";
import type { db } from "~/server/db";
import type {
	PickupPointCreateInput,
	PickupPointDeleteInput,
	PickupPointDetail,
	PickupPointListInput,
	PickupPointSetActiveInput,
	PickupPointStats,
	PickupPointUpdateInput,
} from "~/shared/common/admin-crud/pickup-point.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import {
	AdminCrudError,
	throwConflict,
	throwNotFound,
} from "./_base/admin-crud.errors";
import {
	createPickupPoint,
	findPickupPointById,
	getPickupPointRelationCounts,
	getPickupPointStats,
	hardDeletePickupPoint,
	listPickupPoints,
	type PickupPointDetailRecord,
	type PickupPointRelationCountRecord,
	setPickupPointActive,
	softDeletePickupPoint,
	updatePickupPoint,
} from "./pickup-point.data";

type AdminDb = typeof db;

const PICKUP_POINT_ENTITY = "pickupPoint";
const PICKUP_POINT_LABEL = "Punto de retiro";

function parseDetail(record: PickupPointDetailRecord): PickupPointDetail {
	return pickupPointDetailSchema.parse(record);
}

function plural(count: number, singular: string, pluralForm: string) {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}

function buildRelationBlockMessage(record: PickupPointRelationCountRecord) {
	return `No se puede eliminar definitivamente "${record.name}" porque lo usan ${plural(record._count.userOrders, "pedido", "pedidos")} y ${plural(record._count.shipments, "envío", "envíos")}.`;
}

export async function list(input: PickupPointListInput, database: AdminDb) {
	const records = await listPickupPoints(database, input);
	return pickupPointListOutputSchema.parse(
		records.map(({ _count, ...record }) => ({
			...record,
			pendingOrderCount: _count.userOrders,
		})),
	);
}

export async function getById(id: number, database: AdminDb) {
	const record = await findPickupPointById(database, id);
	if (!record) throwNotFound(PICKUP_POINT_LABEL);
	return parseDetail(record);
}

export async function getStats(database: AdminDb): Promise<PickupPointStats> {
	return pickupPointStatsSchema.parse(await getPickupPointStats(database));
}

export async function create(
	input: PickupPointCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const after = parseDetail(await createPickupPoint(tx, input));

		await writeAdminAuditLog(tx, {
			action: "pickupPoint.create",
			actor,
			entityType: PICKUP_POINT_ENTITY,
			entityId: String(after.id),
			after,
		});

		return after;
	});
}

export async function update(
	input: PickupPointUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findPickupPointById(tx, input.id);
		if (!beforeRecord) throwNotFound(PICKUP_POINT_LABEL);
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throwConflict("No se puede editar un punto de retiro eliminado");
		}

		const after = parseDetail(await updatePickupPoint(tx, input));

		await writeAdminAuditLog(tx, {
			action: "pickupPoint.update",
			actor,
			entityType: PICKUP_POINT_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

/**
 * Deactivating never touches the orders that chose the point: they keep their
 * snapshot until an admin changes their delivery. Checkout stops offering it at
 * once because it lists active points only.
 */
export async function setActive(
	input: PickupPointSetActiveInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findPickupPointById(tx, input.id);
		if (!beforeRecord) throwNotFound(PICKUP_POINT_LABEL);
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throwConflict("No se puede activar un punto de retiro eliminado");
		}

		const after = parseDetail(
			await setPickupPointActive(tx, input.id, input.active),
		);

		await writeAdminAuditLog(tx, {
			action: "pickupPoint.setActive",
			actor,
			entityType: PICKUP_POINT_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: PickupPointDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findPickupPointById(tx, input.id);
		if (!beforeRecord) throwNotFound(PICKUP_POINT_LABEL);
		const before = parseDetail(beforeRecord);

		const after = parseDetail(await softDeletePickupPoint(tx, input.id));

		await writeAdminAuditLog(tx, {
			action: "pickupPoint.softDelete",
			actor,
			entityType: PICKUP_POINT_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: PickupPointDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const record = await getPickupPointRelationCounts(tx, input.id);
		if (!record) throwNotFound(PICKUP_POINT_LABEL);

		if (record._count.userOrders > 0 || record._count.shipments > 0) {
			throw new AdminCrudError(
				"RELATION_BLOCKED",
				buildRelationBlockMessage(record),
			);
		}

		const { _count, ...detail } = record;
		const before = parseDetail(detail);
		const deleted = await hardDeletePickupPoint(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "pickupPoint.hardDelete",
			actor,
			entityType: PICKUP_POINT_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
