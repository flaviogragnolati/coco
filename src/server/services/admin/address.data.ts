import type { Prisma } from "~/prisma/client";
import type {
	AddressCreateInput,
	AddressListInput,
	AddressUpdateInput,
} from "~/shared/common/admin-crud/address.types";

type AdminDbClient = Prisma.TransactionClient;

const addressUserSelect = {
	id: true,
	name: true,
	email: true,
	deleted: true,
} satisfies Prisma.UserSelect;

export const addressListSelect = {
	id: true,
	type: true,
	line1: true,
	line2: true,
	city: true,
	state: true,
	postalCode: true,
	country: true,
	active: true,
	deleted: true,
	updatedAt: true,
	user: {
		select: addressUserSelect,
	},
} satisfies Prisma.AddressSelect;

export const addressDetailSelect = {
	id: true,
	type: true,
	line1: true,
	line2: true,
	city: true,
	state: true,
	postalCode: true,
	country: true,
	active: true,
	deleted: true,
	user: {
		select: addressUserSelect,
	},
} satisfies Prisma.AddressSelect;

export type AddressDetailRecord = Prisma.AddressGetPayload<{
	select: typeof addressDetailSelect;
}>;

export async function listAddresses(
	db: AdminDbClient,
	input: AddressListInput,
) {
	return db.address.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: addressListSelect,
		orderBy: [{ deleted: "asc" }, { active: "desc" }, { updatedAt: "desc" }],
	});
}

export async function findAddressById(db: AdminDbClient, id: number) {
	return db.address.findUnique({
		where: { id },
		select: addressDetailSelect,
	});
}

export async function getAddressStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.address.count(),
		db.address.count({ where: { active: true, deleted: false } }),
		db.address.count({ where: { active: false, deleted: false } }),
		db.address.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createAddress(
	db: AdminDbClient,
	input: AddressCreateInput,
) {
	return db.address.create({
		data: {
			userId: input.userId,
			type: input.type,
			line1: input.line1,
			line2: input.line2 ?? null,
			city: input.city,
			state: input.state,
			postalCode: input.postalCode,
			country: input.country,
			active: input.active,
			deleted: false,
		},
		select: addressDetailSelect,
	});
}

export async function updateAddress(
	db: AdminDbClient,
	input: AddressUpdateInput,
) {
	return db.address.update({
		where: { id: input.id },
		data: {
			userId: input.userId,
			type: input.type,
			line1: input.line1,
			line2: input.line2 ?? null,
			city: input.city,
			state: input.state,
			postalCode: input.postalCode,
			country: input.country,
			active: input.active,
		},
		select: addressDetailSelect,
	});
}

export async function softDeleteAddress(db: AdminDbClient, id: number) {
	return db.address.update({
		where: { id },
		data: {
			active: false,
			deleted: true,
		},
		select: addressDetailSelect,
	});
}

export async function hardDeleteAddress(db: AdminDbClient, id: number) {
	return db.address.delete({
		where: { id },
		select: { id: true },
	});
}
