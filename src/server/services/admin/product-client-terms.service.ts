import {
	productClientTermsDetailSchema,
	productClientTermsListOutputSchema,
	productClientTermsStatsSchema,
} from "~/schemas/admin/product-client-terms.schemas";
import type { db } from "~/server/db";
import type {
	ProductClientTermsCreateInput,
	ProductClientTermsDeleteInput,
	ProductClientTermsDetail,
	ProductClientTermsListInput,
	ProductClientTermsStats,
	ProductClientTermsUpdateInput,
} from "~/shared/common/admin-crud/product-client-terms.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	createProductClientTerms,
	findProductClientTermsById,
	findProductClientTermsProductById,
	getProductClientTermsRelationCounts,
	getProductClientTermsStats,
	hardDeleteProductClientTerms,
	listProductClientTerms,
	type ProductClientTermsDetailRecord,
	type ProductClientTermsRelationCountRecord,
	softDeleteProductClientTerms,
	updateProductClientTerms,
} from "./product-client-terms.data";

type AdminDb = typeof db;

const PRODUCT_CLIENT_TERMS_ENTITY = "productClientTerms";

function parseDetail(
	record: ProductClientTermsDetailRecord,
): ProductClientTermsDetail {
	return productClientTermsDetailSchema.parse(record);
}

function buildRelationBlockMessage(
	record: ProductClientTermsRelationCountRecord,
) {
	const cartItemCount = record._count.cartItems;
	return `No se puede eliminar definitivamente el termino de cliente #${record.id} porque tiene ${cartItemCount} item${cartItemCount === 1 ? "" : "s"} de carrito relacionado${cartItemCount === 1 ? "" : "s"}.`;
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
	const product = await findProductClientTermsProductById(database, productId);
	if (!product) throwNotFound("Producto");
	if (product.deleted && product.id !== currentProductId) {
		throw new AdminCrudError(
			"CONFLICT",
			"No se puede asignar un producto eliminado",
		);
	}
}

export async function list(
	input: ProductClientTermsListInput,
	database: AdminDb,
) {
	const records = await listProductClientTerms(database, input);
	return productClientTermsListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const record = await findProductClientTermsById(database, id);
	if (!record) throwNotFound("Terminos de cliente");
	return parseDetail(record);
}

export async function getStats(
	database: AdminDb,
): Promise<ProductClientTermsStats> {
	return productClientTermsStatsSchema.parse(
		await getProductClientTermsStats(database),
	);
}

export async function create(
	input: ProductClientTermsCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		await assertAssignableProduct(tx, input.productId);

		const record = await createProductClientTerms(tx, input);
		const parsed = parseDetail(record);

		await writeAdminAuditLog(tx, {
			action: "productClientTerms.create",
			actor,
			entityType: PRODUCT_CLIENT_TERMS_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
		});

		return parsed;
	});
}

export async function update(
	input: ProductClientTermsUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findProductClientTermsById(tx, input.id);
		if (!beforeRecord) throwNotFound("Terminos de cliente");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar un termino de cliente eliminado",
			);
		}

		await assertAssignableProduct(tx, input.productId, before.product.id);

		const record = await updateProductClientTerms(tx, input);
		const after = parseDetail(record);

		await writeAdminAuditLog(tx, {
			action: "productClientTerms.update",
			actor,
			entityType: PRODUCT_CLIENT_TERMS_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: ProductClientTermsDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findProductClientTermsById(tx, input.id);
		if (!beforeRecord) throwNotFound("Terminos de cliente");
		const before = parseDetail(beforeRecord);

		const record = await softDeleteProductClientTerms(tx, input.id);
		const after = parseDetail(record);

		await writeAdminAuditLog(tx, {
			action: "productClientTerms.softDelete",
			actor,
			entityType: PRODUCT_CLIENT_TERMS_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: ProductClientTermsDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const record = await getProductClientTermsRelationCounts(tx, input.id);
		if (!record) throwNotFound("Terminos de cliente");

		if (record._count.cartItems > 0) {
			throw new AdminCrudError(
				"RELATION_BLOCKED",
				buildRelationBlockMessage(record),
			);
		}

		const before = parseDetail(record);
		const deleted = await hardDeleteProductClientTerms(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "productClientTerms.hardDelete",
			actor,
			entityType: PRODUCT_CLIENT_TERMS_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
