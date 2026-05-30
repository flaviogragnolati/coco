import {
	addressDetailSchema,
	addressListOutputSchema,
	addressStatsSchema,
} from "~/schemas/admin/address.schemas";
import type { db } from "~/server/db";
import type {
	AddressCreateInput,
	AddressDeleteInput,
	AddressDetail,
	AddressListInput,
	AddressStats,
	AddressUpdateInput,
} from "~/shared/common/admin-crud/address.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	type AddressDetailRecord,
	createAddress,
	findAddressById,
	getAddressStats,
	hardDeleteAddress,
	listAddresses,
	softDeleteAddress,
	updateAddress,
} from "./address.data";
import { findUserSummaryById } from "./user.data";

type AdminDb = typeof db;

const ADDRESS_ENTITY = "address";

function parseDetail(record: AddressDetailRecord): AddressDetail {
	return addressDetailSchema.parse(record);
}

async function assertActiveUserExists(
	userId: string,
	database: Parameters<AdminDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
) {
	const user = await findUserSummaryById(database, userId);
	if (!user) throwNotFound("Usuario");
	if (user.deleted) {
		throw new AdminCrudError(
			"CONFLICT",
			"No se puede asignar una dirección a un usuario eliminado",
		);
	}
}

export async function list(input: AddressListInput, database: AdminDb) {
	const records = await listAddresses(database, input);
	return addressListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const address = await findAddressById(database, id);
	if (!address) throwNotFound("Dirección");
	return parseDetail(address);
}

export async function getStats(database: AdminDb): Promise<AddressStats> {
	return addressStatsSchema.parse(await getAddressStats(database));
}

export async function create(
	input: AddressCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		await assertActiveUserExists(input.userId, tx);

		const address = await createAddress(tx, input);
		const parsed = parseDetail(address);

		await writeAdminAuditLog(tx, {
			action: "address.create",
			actor,
			entityType: ADDRESS_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
		});

		return parsed;
	});
}

export async function update(
	input: AddressUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findAddressById(tx, input.id);
		if (!beforeRecord) throwNotFound("Dirección");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar una dirección eliminada",
			);
		}

		await assertActiveUserExists(input.userId, tx);

		const address = await updateAddress(tx, input);
		const after = parseDetail(address);

		await writeAdminAuditLog(tx, {
			action: "address.update",
			actor,
			entityType: ADDRESS_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: AddressDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findAddressById(tx, input.id);
		if (!beforeRecord) throwNotFound("Dirección");
		const before = parseDetail(beforeRecord);

		const address = await softDeleteAddress(tx, input.id);
		const after = parseDetail(address);

		await writeAdminAuditLog(tx, {
			action: "address.softDelete",
			actor,
			entityType: ADDRESS_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: AddressDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findAddressById(tx, input.id);
		if (!beforeRecord) throwNotFound("Dirección");
		const before = parseDetail(beforeRecord);
		const deleted = await hardDeleteAddress(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "address.hardDelete",
			actor,
			entityType: ADDRESS_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
