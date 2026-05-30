import type {
	UserListInput,
	UserRole,
} from "~/shared/common/admin-crud/user.types";
import type { Prisma } from "../../../../generated/prisma/client";

type AdminDbClient = Prisma.TransactionClient;

const userAddressSelect = {
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
} satisfies Prisma.AddressSelect;

export const userSummarySelect = {
	id: true,
	name: true,
	email: true,
	deleted: true,
} satisfies Prisma.UserSelect;

const userListSelect = {
	id: true,
	name: true,
	email: true,
	emailVerified: true,
	image: true,
	role: true,
	active: true,
	deleted: true,
	updatedAt: true,
	_count: {
		select: {
			addresses: true,
		},
	},
} satisfies Prisma.UserSelect;

export const userDetailSelect = {
	id: true,
	name: true,
	email: true,
	emailVerified: true,
	image: true,
	role: true,
	active: true,
	deleted: true,
	addresses: {
		where: { deleted: false },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: userAddressSelect,
	},
} satisfies Prisma.UserSelect;

const userRelationCountSelect = {
	id: true,
	name: true,
	email: true,
	emailVerified: true,
	image: true,
	role: true,
	active: true,
	deleted: true,
	addresses: {
		where: { deleted: false },
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: userAddressSelect,
	},
	_count: {
		select: {
			addresses: true,
			paymentMethods: true,
			carts: true,
			userOrders: true,
		},
	},
} satisfies Prisma.UserSelect;

type UserListRecordRaw = Prisma.UserGetPayload<{
	select: typeof userListSelect;
}>;

export type UserWriteInput = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image?: string;
	role: UserRole;
	active: boolean;
};

export type UserListRecord = Omit<UserListRecordRaw, "_count"> & {
	addressCount: number;
};

export type UserDetailRecord = Prisma.UserGetPayload<{
	select: typeof userDetailSelect;
}>;

export type UserRelationCountRecord = Prisma.UserGetPayload<{
	select: typeof userRelationCountSelect;
}>;

export type UserSummaryRecord = Prisma.UserGetPayload<{
	select: typeof userSummarySelect;
}>;

export async function listUsers(db: AdminDbClient, input: UserListInput) {
	const records = await db.user.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: userListSelect,
		orderBy: [{ deleted: "asc" }, { active: "desc" }, { name: "asc" }],
	});

	return records.map(({ _count, ...record }) => ({
		...record,
		addressCount: _count.addresses,
	}));
}

export async function findUserById(db: AdminDbClient, id: string) {
	return db.user.findUnique({
		where: { id },
		select: userDetailSelect,
	});
}

export async function findUserSummaryById(db: AdminDbClient, id: string) {
	return db.user.findUnique({
		where: { id },
		select: userSummarySelect,
	});
}

export async function getUserStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.user.count(),
		db.user.count({ where: { active: true, deleted: false } }),
		db.user.count({ where: { active: false, deleted: false } }),
		db.user.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createUser(db: AdminDbClient, input: UserWriteInput) {
	return db.user.create({
		data: {
			id: input.id,
			name: input.name,
			email: input.email,
			emailVerified: input.emailVerified,
			image: input.image ?? null,
			role: input.role,
			active: input.active,
			deleted: false,
		},
		select: userDetailSelect,
	});
}

export async function updateUser(db: AdminDbClient, input: UserWriteInput) {
	return db.user.update({
		where: { id: input.id },
		data: {
			name: input.name,
			email: input.email,
			emailVerified: input.emailVerified,
			image: input.image ?? null,
			role: input.role,
			active: input.active,
		},
		select: userDetailSelect,
	});
}

export async function softDeleteUser(db: AdminDbClient, id: string) {
	return db.user.update({
		where: { id },
		data: {
			active: false,
			deleted: true,
		},
		select: userDetailSelect,
	});
}

export async function hardDeleteUser(db: AdminDbClient, id: string) {
	return db.user.delete({
		where: { id },
		select: { id: true },
	});
}

export async function getUserRelationCounts(db: AdminDbClient, id: string) {
	return db.user.findUnique({
		where: { id },
		select: userRelationCountSelect,
	});
}
