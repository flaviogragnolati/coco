import {
	brandDetailSchema,
	brandListOutputSchema,
	brandStatsSchema,
} from "~/schemas/admin/brand.schemas";
import type { db } from "~/server/db";
import type {
	BrandCreateInput,
	BrandDeleteInput,
	BrandDetail,
	BrandListInput,
	BrandStats,
	BrandUpdateInput,
} from "~/shared/common/admin-crud/brand.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	type BrandDetailRecord,
	type BrandRelationCountRecord,
	createBrand,
	findBrandById,
	getBrandRelationCounts,
	getBrandStats,
	hardDeleteBrand,
	listBrands,
	softDeleteBrand,
	updateBrand,
} from "./brand.data";

type AdminDb = typeof db;

const BRAND_ENTITY = "brand";

function parseDetail(record: BrandDetailRecord): BrandDetail {
	return brandDetailSchema.parse(record);
}

function buildRelationBlockMessage(record: BrandRelationCountRecord) {
	const productCount = record._count.products;
	return `No se puede eliminar definitivamente "${record.name}" porque tiene ${productCount} producto${productCount === 1 ? "" : "s"} relacionado${productCount === 1 ? "" : "s"}.`;
}

export async function list(input: BrandListInput, database: AdminDb) {
	const records = await listBrands(database, input);
	return brandListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const brand = await findBrandById(database, id);
	if (!brand) throwNotFound("Marca");
	return parseDetail(brand);
}

export async function getStats(database: AdminDb): Promise<BrandStats> {
	return brandStatsSchema.parse(await getBrandStats(database));
}

export async function create(
	input: BrandCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const brand = await createBrand(tx, input);
		const parsed = parseDetail(brand);

		await writeAdminAuditLog(tx, {
			action: "brand.create",
			actor,
			entityType: BRAND_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
		});

		return parsed;
	});
}

export async function update(
	input: BrandUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findBrandById(tx, input.id);
		if (!beforeRecord) throwNotFound("Marca");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar una marca eliminada",
			);
		}

		const brand = await updateBrand(tx, input);
		const after = parseDetail(brand);

		await writeAdminAuditLog(tx, {
			action: "brand.update",
			actor,
			entityType: BRAND_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: BrandDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findBrandById(tx, input.id);
		if (!beforeRecord) throwNotFound("Marca");
		const before = parseDetail(beforeRecord);

		const brand = await softDeleteBrand(tx, input.id);
		const after = parseDetail(brand);

		await writeAdminAuditLog(tx, {
			action: "brand.softDelete",
			actor,
			entityType: BRAND_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: BrandDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const brand = await getBrandRelationCounts(tx, input.id);
		if (!brand) throwNotFound("Marca");

		if (brand._count.products > 0) {
			throw new AdminCrudError(
				"RELATION_BLOCKED",
				buildRelationBlockMessage(brand),
			);
		}

		const before = parseDetail(brand);
		const deleted = await hardDeleteBrand(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "brand.hardDelete",
			actor,
			entityType: BRAND_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
