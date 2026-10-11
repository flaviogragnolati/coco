import type { Prisma } from "~/prisma/client";
import type {
	CategoryCreateInput,
	CategoryListInput,
	CategoryUpdateInput,
} from "~/shared/common/admin-crud/category.types";

type AdminDbClient = Prisma.TransactionClient;

const categoryListSelect = {
	id: true,
	name: true,
	sortOrder: true,
	active: true,
	deleted: true,
	updatedAt: true,
	_count: {
		select: {
			products: true,
		},
	},
} satisfies Prisma.CategorySelect;

export const categoryDetailSelect = {
	id: true,
	name: true,
	sortOrder: true,
	active: true,
	deleted: true,
} satisfies Prisma.CategorySelect;

const categoryRelationCountSelect = {
	...categoryDetailSelect,
	_count: {
		select: {
			products: true,
		},
	},
} satisfies Prisma.CategorySelect;

export type CategoryDetailRecord = Prisma.CategoryGetPayload<{
	select: typeof categoryDetailSelect;
}>;

export type CategoryRelationCountRecord = Prisma.CategoryGetPayload<{
	select: typeof categoryRelationCountSelect;
}>;

export async function listCategories(
	db: AdminDbClient,
	input: CategoryListInput,
) {
	return db.category.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: categoryListSelect,
		orderBy: [{ deleted: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
	});
}

export async function findCategoryById(db: AdminDbClient, id: number) {
	return db.category.findUnique({
		where: { id },
		select: categoryDetailSelect,
	});
}

export async function getCategoryStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.category.count(),
		db.category.count({ where: { active: true, deleted: false } }),
		db.category.count({ where: { active: false, deleted: false } }),
		db.category.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createCategory(
	db: AdminDbClient,
	input: CategoryCreateInput,
) {
	return db.category.create({
		data: {
			name: input.name,
			sortOrder: input.sortOrder,
			active: input.active,
			deleted: false,
		},
		select: categoryDetailSelect,
	});
}

export async function updateCategory(
	db: AdminDbClient,
	input: CategoryUpdateInput,
) {
	return db.category.update({
		where: { id: input.id },
		data: {
			name: input.name,
			sortOrder: input.sortOrder,
			active: input.active,
		},
		select: categoryDetailSelect,
	});
}

export async function softDeleteCategory(db: AdminDbClient, id: number) {
	return db.category.update({
		where: { id },
		data: {
			active: false,
			deleted: true,
		},
		select: categoryDetailSelect,
	});
}

export async function hardDeleteCategory(db: AdminDbClient, id: number) {
	return db.category.delete({
		where: { id },
		select: { id: true },
	});
}

export async function getCategoryRelationCounts(
	db: AdminDbClient,
	id: number,
) {
	return db.category.findUnique({
		where: { id },
		select: categoryRelationCountSelect,
	});
}
