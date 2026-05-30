import { addressDetailSchema } from "~/schemas/admin/address.schemas";
import {
	userDetailSchema,
	userListOutputSchema,
	userStatsSchema,
} from "~/schemas/admin/user.schemas";
import type { db } from "~/server/db";
import type { AddressDetail } from "~/shared/common/admin-crud/address.types";
import type {
	UserCreateInput,
	UserDeleteInput,
	UserDetail,
	UserListInput,
	UserStats,
	UserUpdateInput,
} from "~/shared/common/admin-crud/user.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	type AddressDetailRecord,
	createAddress,
	softDeleteAddress,
	updateAddress,
} from "./address.data";
import {
	createUser,
	findUserById,
	getUserRelationCounts,
	getUserStats,
	hardDeleteUser,
	listUsers,
	softDeleteUser,
	type UserDetailRecord,
	type UserRelationCountRecord,
	type UserWriteInput,
	updateUser,
} from "./user.data";

type AdminDb = typeof db;

const USER_ENTITY = "user";
const ADDRESS_ENTITY = "address";

function parseDetail(record: UserDetailRecord): UserDetail {
	return userDetailSchema.parse(record);
}

function parseAddressDetail(record: AddressDetailRecord): AddressDetail {
	return addressDetailSchema.parse(record);
}

function buildRelationBlockMessage(record: UserRelationCountRecord) {
	const blockingParts = [
		record._count.addresses > 0
			? `${record._count.addresses} direcciones`
			: null,
		record._count.paymentMethods > 0
			? `${record._count.paymentMethods} métodos de pago`
			: null,
		record._count.carts > 0 ? `${record._count.carts} carritos` : null,
		record._count.userOrders > 0 ? `${record._count.userOrders} órdenes` : null,
	].filter(Boolean);

	return `No se puede eliminar definitivamente "${record.name}" porque tiene ${blockingParts.join(", ")} relacionados.`;
}

function isUniqueEmailError(error: unknown) {
	if (typeof error !== "object" || error === null) return false;

	const candidate = error as {
		code?: unknown;
		meta?: { target?: unknown };
	};

	return (
		candidate.code === "P2002" &&
		Array.isArray(candidate.meta?.target) &&
		candidate.meta?.target.includes("email")
	);
}

function mapUserWriteError(error: unknown): never {
	if (isUniqueEmailError(error)) {
		throw new AdminCrudError("CONFLICT", "Ya existe un usuario con ese email");
	}

	throw error;
}

function toUserWriteInput(
	input: UserCreateInput | UserUpdateInput,
	id: string,
): UserWriteInput {
	return {
		id,
		name: input.name,
		email: input.email,
		emailVerified: input.emailVerified,
		image: input.image,
		role: input.role,
		active: input.active,
	};
}

function toInlineAddressAuditDetail(
	user: UserDetail,
	address: UserDetail["addresses"][number],
): AddressDetail {
	return addressDetailSchema.parse({
		...address,
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			deleted: user.deleted,
		},
	});
}

function assertNoExistingAddressIds(input: UserCreateInput) {
	if (input.addresses.some((address) => address.id !== undefined)) {
		throw new AdminCrudError(
			"CONFLICT",
			"Las direcciones nuevas no pueden incluir un id existente",
		);
	}
}

function assertUniqueAddressIds(input: UserUpdateInput) {
	const ids = input.addresses
		.map((address) => address.id)
		.filter((id): id is number => typeof id === "number");

	if (new Set(ids).size !== ids.length) {
		throw new AdminCrudError(
			"CONFLICT",
			"No se pueden repetir direcciones en el mismo usuario",
		);
	}
}

export async function list(input: UserListInput, database: AdminDb) {
	const records = await listUsers(database, input);
	return userListOutputSchema.parse(records);
}

export async function getById(id: string, database: AdminDb) {
	const user = await findUserById(database, id);
	if (!user) throwNotFound("Usuario");
	return parseDetail(user);
}

export async function getStats(database: AdminDb): Promise<UserStats> {
	return userStatsSchema.parse(await getUserStats(database));
}

export async function create(
	input: UserCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	assertNoExistingAddressIds(input);

	try {
		return await database.$transaction(async (tx) => {
			const userId = crypto.randomUUID();
			await createUser(tx, toUserWriteInput(input, userId));

			for (const address of input.addresses) {
				const createdAddress = parseAddressDetail(
					await createAddress(tx, {
						userId,
						type: address.type,
						line1: address.line1,
						line2: address.line2,
						city: address.city,
						state: address.state,
						postalCode: address.postalCode,
						country: address.country,
						active: address.active,
					}),
				);

				await writeAdminAuditLog(tx, {
					action: "address.create",
					actor,
					entityType: ADDRESS_ENTITY,
					entityId: String(createdAddress.id),
					after: createdAddress,
					metadata: { inlineFrom: USER_ENTITY, ownerUserId: userId },
				});
			}

			const afterRecord = await findUserById(tx, userId);
			if (!afterRecord) throwNotFound("Usuario");
			const after = parseDetail(afterRecord);

			await writeAdminAuditLog(tx, {
				action: "user.create",
				actor,
				entityType: USER_ENTITY,
				entityId: after.id,
				after,
			});

			return after;
		});
	} catch (error) {
		mapUserWriteError(error);
	}
}

export async function update(
	input: UserUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	assertUniqueAddressIds(input);

	try {
		return await database.$transaction(async (tx) => {
			const beforeRecord = await findUserById(tx, input.id);
			if (!beforeRecord) throwNotFound("Usuario");
			const before = parseDetail(beforeRecord);

			if (before.deleted) {
				throw new AdminCrudError(
					"CONFLICT",
					"No se puede editar un usuario eliminado",
				);
			}

			await updateUser(tx, toUserWriteInput(input, input.id));

			const existingAddresses = new Map(
				before.addresses.map((address) => [address.id, address]),
			);
			const submittedAddressIds = new Set<number>();

			for (const address of input.addresses) {
				if (address.id !== undefined) {
					const currentAddress = existingAddresses.get(address.id);
					if (!currentAddress) {
						throw new AdminCrudError(
							"CONFLICT",
							"No se puede actualizar una dirección que no pertenece al usuario",
						);
					}

					submittedAddressIds.add(address.id);

					const updatedAddress = parseAddressDetail(
						await updateAddress(tx, {
							id: address.id,
							userId: input.id,
							type: address.type,
							line1: address.line1,
							line2: address.line2,
							city: address.city,
							state: address.state,
							postalCode: address.postalCode,
							country: address.country,
							active: address.active,
						}),
					);

					await writeAdminAuditLog(tx, {
						action: "address.update",
						actor,
						entityType: ADDRESS_ENTITY,
						entityId: String(updatedAddress.id),
						before: toInlineAddressAuditDetail(before, currentAddress),
						after: updatedAddress,
						metadata: { inlineFrom: USER_ENTITY, ownerUserId: input.id },
					});
					continue;
				}

				const createdAddress = parseAddressDetail(
					await createAddress(tx, {
						userId: input.id,
						type: address.type,
						line1: address.line1,
						line2: address.line2,
						city: address.city,
						state: address.state,
						postalCode: address.postalCode,
						country: address.country,
						active: address.active,
					}),
				);

				await writeAdminAuditLog(tx, {
					action: "address.create",
					actor,
					entityType: ADDRESS_ENTITY,
					entityId: String(createdAddress.id),
					after: createdAddress,
					metadata: { inlineFrom: USER_ENTITY, ownerUserId: input.id },
				});
			}

			for (const existingAddress of before.addresses) {
				if (submittedAddressIds.has(existingAddress.id)) continue;

				const deletedAddress = parseAddressDetail(
					await softDeleteAddress(tx, existingAddress.id),
				);

				await writeAdminAuditLog(tx, {
					action: "address.softDelete",
					actor,
					entityType: ADDRESS_ENTITY,
					entityId: String(deletedAddress.id),
					before: toInlineAddressAuditDetail(before, existingAddress),
					after: deletedAddress,
					metadata: { inlineFrom: USER_ENTITY, ownerUserId: input.id },
				});
			}

			const afterRecord = await findUserById(tx, input.id);
			if (!afterRecord) throwNotFound("Usuario");
			const after = parseDetail(afterRecord);

			await writeAdminAuditLog(tx, {
				action: "user.update",
				actor,
				entityType: USER_ENTITY,
				entityId: after.id,
				before,
				after,
			});

			return after;
		});
	} catch (error) {
		mapUserWriteError(error);
	}
}

export async function softDelete(
	input: UserDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findUserById(tx, input.id);
		if (!beforeRecord) throwNotFound("Usuario");
		const before = parseDetail(beforeRecord);

		const user = await softDeleteUser(tx, input.id);
		const after = parseDetail(user);

		await writeAdminAuditLog(tx, {
			action: "user.softDelete",
			actor,
			entityType: USER_ENTITY,
			entityId: after.id,
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: UserDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const user = await getUserRelationCounts(tx, input.id);
		if (!user) throwNotFound("Usuario");

		const hasRestrictiveRelations =
			user._count.addresses > 0 ||
			user._count.paymentMethods > 0 ||
			user._count.carts > 0 ||
			user._count.userOrders > 0;

		if (hasRestrictiveRelations) {
			throw new AdminCrudError(
				"RELATION_BLOCKED",
				buildRelationBlockMessage(user),
			);
		}

		const before = parseDetail(user);
		const deleted = await hardDeleteUser(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "user.hardDelete",
			actor,
			entityType: USER_ENTITY,
			entityId: deleted.id,
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
