import {
	productLocalConstraintsDetailSchema,
	productLocalConstraintsListOutputSchema,
	productLocalConstraintsStatsSchema,
} from "~/schemas/admin/product-local-constraints.schemas";
import type { db } from "~/server/db";
import type {
	ProductLocalConstraintsCreateInput,
	ProductLocalConstraintsDeleteInput,
	ProductLocalConstraintsDetail,
	ProductLocalConstraintsListInput,
	ProductLocalConstraintsStats,
	ProductLocalConstraintsUpdateInput,
} from "~/shared/common/admin-crud/product-local-constraints.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	createProductLocalConstraints,
	findProductLocalConstraintsById,
	findProductLocalConstraintsProductById,
	getProductLocalConstraintsStats,
	hardDeleteProductLocalConstraints,
	listProductLocalConstraints,
	type ProductLocalConstraintsDetailRecord,
	softDeleteProductLocalConstraints,
	updateProductLocalConstraints,
} from "./product-local-constraints.data";

type AdminDb = typeof db;

const PRODUCT_LOCAL_CONSTRAINTS_ENTITY = "productLocalConstraints";

function parseDetail(
	record: ProductLocalConstraintsDetailRecord,
): ProductLocalConstraintsDetail {
	return productLocalConstraintsDetailSchema.parse(record);
}

async function assertAssignableProduct(
	database: Parameters<AdminDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
	productId: number,
	currentProductId?: number,
) {
	const product = await findProductLocalConstraintsProductById(
		database,
		productId,
	);
	if (!product) throwNotFound("Producto");
	if (product.deleted && product.id !== currentProductId) {
		throw new AdminCrudError(
			"CONFLICT",
			"No se puede asignar un producto eliminado",
		);
	}
}

export async function list(
	input: ProductLocalConstraintsListInput,
	database: AdminDb,
) {
	const records = await listProductLocalConstraints(database, input);
	return productLocalConstraintsListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const record = await findProductLocalConstraintsById(database, id);
	if (!record) throwNotFound("Restriccion local");
	return parseDetail(record);
}

export async function getStats(
	database: AdminDb,
): Promise<ProductLocalConstraintsStats> {
	return productLocalConstraintsStatsSchema.parse(
		await getProductLocalConstraintsStats(database),
	);
}

export async function create(
	input: ProductLocalConstraintsCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		await assertAssignableProduct(tx, input.productId);

		const record = await createProductLocalConstraints(tx, input);
		const parsed = parseDetail(record);

		await writeAdminAuditLog(tx, {
			action: "productLocalConstraints.create",
			actor,
			entityType: PRODUCT_LOCAL_CONSTRAINTS_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
		});

		return parsed;
	});
}

export async function update(
	input: ProductLocalConstraintsUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findProductLocalConstraintsById(tx, input.id);
		if (!beforeRecord) throwNotFound("Restriccion local");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar una restriccion local eliminada",
			);
		}

		await assertAssignableProduct(tx, input.productId, before.product.id);

		const record = await updateProductLocalConstraints(tx, input);
		const after = parseDetail(record);

		await writeAdminAuditLog(tx, {
			action: "productLocalConstraints.update",
			actor,
			entityType: PRODUCT_LOCAL_CONSTRAINTS_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: ProductLocalConstraintsDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findProductLocalConstraintsById(tx, input.id);
		if (!beforeRecord) throwNotFound("Restriccion local");
		const before = parseDetail(beforeRecord);

		const record = await softDeleteProductLocalConstraints(tx, input.id);
		const after = parseDetail(record);

		await writeAdminAuditLog(tx, {
			action: "productLocalConstraints.softDelete",
			actor,
			entityType: PRODUCT_LOCAL_CONSTRAINTS_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: ProductLocalConstraintsDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findProductLocalConstraintsById(tx, input.id);
		if (!beforeRecord) throwNotFound("Restriccion local");
		const before = parseDetail(beforeRecord);
		const deleted = await hardDeleteProductLocalConstraints(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "productLocalConstraints.hardDelete",
			actor,
			entityType: PRODUCT_LOCAL_CONSTRAINTS_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
