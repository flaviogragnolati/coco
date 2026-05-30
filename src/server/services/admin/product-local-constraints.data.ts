import type {
	ProductLocalConstraintsCreateInput,
	ProductLocalConstraintsListInput,
	ProductLocalConstraintsUpdateInput,
} from "~/shared/common/admin-crud/product-local-constraints.types";
import { Prisma } from "../../../../generated/prisma/client";
import { toPrismaInputJson } from "./_base/prisma-json";

type AdminDbClient = Prisma.TransactionClient;

const productReferenceSelect = {
	id: true,
	name: true,
	unit: true,
	deleted: true,
} satisfies Prisma.ProductSelect;

export const productLocalConstraintsListSelect = {
	id: true,
	product: {
		select: productReferenceSelect,
	},
	constraintType: true,
	value: true,
	scope: true,
	reason: true,
	active: true,
	deleted: true,
	fromDate: true,
	toDate: true,
	updatedAt: true,
} satisfies Prisma.ProductLocalConstraintsSelect;

export const productLocalConstraintsDetailSelect = {
	id: true,
	product: {
		select: productReferenceSelect,
	},
	constraintType: true,
	value: true,
	scope: true,
	reason: true,
	active: true,
	deleted: true,
	fromDate: true,
	toDate: true,
} satisfies Prisma.ProductLocalConstraintsSelect;

export type ProductLocalConstraintsDetailRecord =
	Prisma.ProductLocalConstraintsGetPayload<{
		select: typeof productLocalConstraintsDetailSelect;
	}>;

function toNullablePrismaJson(value?: string) {
	if (value === undefined) return Prisma.DbNull;

	const parsed = JSON.parse(value) as unknown;
	if (parsed === null) return Prisma.JsonNull;

	return toPrismaInputJson(parsed);
}

export async function listProductLocalConstraints(
	db: AdminDbClient,
	input: ProductLocalConstraintsListInput,
) {
	return db.productLocalConstraints.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: productLocalConstraintsListSelect,
		orderBy: [
			{ deleted: "asc" },
			{ active: "desc" },
			{ fromDate: "desc" },
			{ id: "desc" },
		],
	});
}

export async function findProductLocalConstraintsById(
	db: AdminDbClient,
	id: number,
) {
	return db.productLocalConstraints.findUnique({
		where: { id },
		select: productLocalConstraintsDetailSelect,
	});
}

export async function getProductLocalConstraintsStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.productLocalConstraints.count(),
		db.productLocalConstraints.count({
			where: { active: true, deleted: false },
		}),
		db.productLocalConstraints.count({
			where: { active: false, deleted: false },
		}),
		db.productLocalConstraints.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createProductLocalConstraints(
	db: AdminDbClient,
	input: ProductLocalConstraintsCreateInput,
) {
	return db.productLocalConstraints.create({
		data: {
			productId: input.productId,
			constraintType: input.constraintType ?? null,
			value: toNullablePrismaJson(input.value),
			scope: toNullablePrismaJson(input.scope),
			reason: input.reason ?? null,
			active: input.active,
			deleted: false,
			fromDate: new Date(input.fromDate),
			toDate: input.toDate ? new Date(input.toDate) : null,
		},
		select: productLocalConstraintsDetailSelect,
	});
}

export async function updateProductLocalConstraints(
	db: AdminDbClient,
	input: ProductLocalConstraintsUpdateInput,
) {
	return db.productLocalConstraints.update({
		where: { id: input.id },
		data: {
			productId: input.productId,
			constraintType: input.constraintType ?? null,
			value: toNullablePrismaJson(input.value),
			scope: toNullablePrismaJson(input.scope),
			reason: input.reason ?? null,
			active: input.active,
			fromDate: new Date(input.fromDate),
			toDate: input.toDate ? new Date(input.toDate) : null,
		},
		select: productLocalConstraintsDetailSelect,
	});
}

export async function softDeleteProductLocalConstraints(
	db: AdminDbClient,
	id: number,
) {
	return db.productLocalConstraints.update({
		where: { id },
		data: {
			active: false,
			deleted: true,
		},
		select: productLocalConstraintsDetailSelect,
	});
}

export async function hardDeleteProductLocalConstraints(
	db: AdminDbClient,
	id: number,
) {
	return db.productLocalConstraints.delete({
		where: { id },
		select: { id: true },
	});
}

export async function findProductLocalConstraintsProductById(
	db: AdminDbClient,
	id: number,
) {
	return db.product.findUnique({
		where: { id },
		select: productReferenceSelect,
	});
}
