import {
	categoryDetailSchema,
	categoryListOutputSchema,
	categoryStatsSchema,
} from "~/schemas/admin/category.schemas";
import type { db } from "~/server/db";
import type {
	CategoryCreateInput,
	CategoryDeleteInput,
	CategoryDetail,
	CategoryListInput,
	CategoryStats,
	CategoryUpdateInput,
} from "~/shared/common/admin-crud/category.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	type CategoryDetailRecord,
	type CategoryRelationCountRecord,
	createCategory,
	findCategoryById,
	getCategoryRelationCounts,
	getCategoryStats,
	hardDeleteCategory,
	listCategories,
	softDeleteCategory,
	updateCategory,
} from "./category.data";

type AdminDb = typeof db;

const CATEGORY_ENTITY = "category";

function parseDetail(record: CategoryDetailRecord): CategoryDetail {
	return categoryDetailSchema.parse(record);
}

function buildRelationBlockMessage(record: CategoryRelationCountRecord) {
	const productCount = record._count.products;
	return `No se puede eliminar definitivamente "${record.name}" porque tiene ${productCount} producto${productCount === 1 ? "" : "s"} relacionado${productCount === 1 ? "" : "s"}.`;
}

export async function list(input: CategoryListInput, database: AdminDb) {
	const records = await listCategories(database, input);
	return categoryListOutputSchema.parse(
		records.map(({ _count, ...record }) => ({
			...record,
			productCount: _count.products,
		})),
	);
}

export async function getById(id: number, database: AdminDb) {
	const category = await findCategoryById(database, id);
	if (!category) throwNotFound("Categoría");
	return parseDetail(category);
}

export async function getStats(database: AdminDb): Promise<CategoryStats> {
	return categoryStatsSchema.parse(await getCategoryStats(database));
}

export async function create(
	input: CategoryCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const category = await createCategory(tx, input);
		const parsed = parseDetail(category);

		await writeAdminAuditLog(tx, {
			action: "category.create",
			actor,
			entityType: CATEGORY_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
		});

		return parsed;
	});
}

export async function update(
	input: CategoryUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findCategoryById(tx, input.id);
		if (!beforeRecord) throwNotFound("Categoría");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar una categoría eliminada",
			);
		}

		const category = await updateCategory(tx, input);
		const after = parseDetail(category);

		await writeAdminAuditLog(tx, {
			action: "category.update",
			actor,
			entityType: CATEGORY_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: CategoryDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findCategoryById(tx, input.id);
		if (!beforeRecord) throwNotFound("Categoría");
		const before = parseDetail(beforeRecord);

		const category = await softDeleteCategory(tx, input.id);
		const after = parseDetail(category);

		await writeAdminAuditLog(tx, {
			action: "category.softDelete",
			actor,
			entityType: CATEGORY_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: CategoryDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const category = await getCategoryRelationCounts(tx, input.id);
		if (!category) throwNotFound("Categoría");

		if (category._count.products > 0) {
			throw new AdminCrudError(
				"RELATION_BLOCKED",
				buildRelationBlockMessage(category),
			);
		}

		const before = parseDetail(category);
		const deleted = await hardDeleteCategory(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "category.hardDelete",
			actor,
			entityType: CATEGORY_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
