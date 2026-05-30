import type { Prisma } from "../../../../generated/prisma/client";

import type {
	SupplierCreateInput,
	SupplierListInput,
	SupplierUpdateInput,
} from "~/shared/common/admin-crud/supplier.types";
import { toPrismaInputJson } from "./_base/prisma-json";

type AdminDbClient = Prisma.TransactionClient;

export const supplierListSelect = {
	id: true,
	name: true,
	description: true,
	active: true,
	deleted: true,
	updatedAt: true,
} satisfies Prisma.SupplierSelect;

export const supplierDetailSelect = {
	id: true,
	name: true,
	description: true,
	active: true,
	deleted: true,
	address: true,
	contactInfo: true,
} satisfies Prisma.SupplierSelect;

const supplierRelationCountSelect = {
	id: true,
	name: true,
	description: true,
	active: true,
	deleted: true,
	address: true,
	contactInfo: true,
	_count: {
		select: {
			productSupplierTerms: true,
			lots: true,
			supplierOrders: true,
		},
	},
} satisfies Prisma.SupplierSelect;

export type SupplierListRecord = Prisma.SupplierGetPayload<{
	select: typeof supplierListSelect;
}>;

export type SupplierDetailRecord = Prisma.SupplierGetPayload<{
	select: typeof supplierDetailSelect;
}>;

export type SupplierRelationCountRecord = Prisma.SupplierGetPayload<{
	select: typeof supplierRelationCountSelect;
}>;

export async function listSuppliers(
	db: AdminDbClient,
	input: SupplierListInput,
) {
	return db.supplier.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: supplierListSelect,
		orderBy: [{ deleted: "asc" }, { active: "desc" }, { name: "asc" }],
	});
}

export async function findSupplierById(db: AdminDbClient, id: number) {
	return db.supplier.findUnique({
		where: { id },
		select: supplierDetailSelect,
	});
}

export async function getSupplierStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.supplier.count(),
		db.supplier.count({ where: { active: true, deleted: false } }),
		db.supplier.count({ where: { active: false, deleted: false } }),
		db.supplier.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createSupplier(
	db: AdminDbClient,
	input: SupplierCreateInput,
) {
	return db.supplier.create({
		data: {
			name: input.name,
			description: input.description ?? null,
			active: input.active,
			deleted: false,
			address: toPrismaInputJson(input.address),
			contactInfo: toPrismaInputJson(input.contactInfo),
		},
		select: supplierDetailSelect,
	});
}

export async function updateSupplier(
	db: AdminDbClient,
	input: SupplierUpdateInput,
) {
	return db.supplier.update({
		where: { id: input.id },
		data: {
			name: input.name,
			description: input.description ?? null,
			active: input.active,
			address: toPrismaInputJson(input.address),
			contactInfo: toPrismaInputJson(input.contactInfo),
		},
		select: supplierDetailSelect,
	});
}

export async function softDeleteSupplier(db: AdminDbClient, id: number) {
	return db.supplier.update({
		where: { id },
		data: {
			active: false,
			deleted: true,
		},
		select: supplierDetailSelect,
	});
}

export async function hardDeleteSupplier(db: AdminDbClient, id: number) {
	return db.supplier.delete({
		where: { id },
		select: { id: true },
	});
}

export async function getSupplierRelationCounts(
	db: AdminDbClient,
	id: number,
) {
	return db.supplier.findUnique({
		where: { id },
		select: supplierRelationCountSelect,
	});
}
