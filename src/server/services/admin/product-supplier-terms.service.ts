import {
	productSupplierTermsDetailSchema,
	productSupplierTermsListOutputSchema,
	productSupplierTermsStatsSchema,
} from "~/schemas/admin/product-supplier-terms.schemas";
import type { db } from "~/server/db";
import type {
	ProductSupplierTermsCreateInput,
	ProductSupplierTermsDeleteInput,
	ProductSupplierTermsDetail,
	ProductSupplierTermsListInput,
	ProductSupplierTermsStats,
	ProductSupplierTermsUpdateInput,
} from "~/shared/common/admin-crud/product-supplier-terms.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	createProductSupplierTerms,
	findProductSupplierTermsById,
	findProductSupplierTermsProductById,
	findProductSupplierTermsSupplierById,
	getProductSupplierTermsRelationCounts,
	getProductSupplierTermsStats,
	hardDeleteProductSupplierTerms,
	listProductSupplierTerms,
	type ProductSupplierTermsDetailRecord,
	type ProductSupplierTermsRelationCountRecord,
	softDeleteProductSupplierTerms,
	updateProductSupplierTerms,
} from "./product-supplier-terms.data";

type AdminDb = typeof db;

const PRODUCT_SUPPLIER_TERMS_ENTITY = "productSupplierTerms";

function parseDetail(
	record: ProductSupplierTermsDetailRecord,
): ProductSupplierTermsDetail {
	return productSupplierTermsDetailSchema.parse(record);
}

function buildRelationBlockMessage(
	record: ProductSupplierTermsRelationCountRecord,
) {
	const lotItemCount = record._count.lotItems;
	return `No se puede eliminar definitivamente el termino de proveedor #${record.id} porque tiene ${lotItemCount} item${lotItemCount === 1 ? "" : "s"} de lote relacionado${lotItemCount === 1 ? "" : "s"}.`;
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
	const product = await findProductSupplierTermsProductById(
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

async function assertAssignableSupplier(
	database: Parameters<AdminDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
	supplierId: number,
	currentSupplierId?: number,
) {
	const supplier = await findProductSupplierTermsSupplierById(
		database,
		supplierId,
	);
	if (!supplier) throwNotFound("Proveedor");
	if (supplier.deleted && supplier.id !== currentSupplierId) {
		throw new AdminCrudError(
			"CONFLICT",
			"No se puede asignar un proveedor eliminado",
		);
	}
}

export async function list(
	input: ProductSupplierTermsListInput,
	database: AdminDb,
) {
	const records = await listProductSupplierTerms(database, input);
	return productSupplierTermsListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const record = await findProductSupplierTermsById(database, id);
	if (!record) throwNotFound("Terminos de proveedor");
	return parseDetail(record);
}

export async function getStats(
	database: AdminDb,
): Promise<ProductSupplierTermsStats> {
	return productSupplierTermsStatsSchema.parse(
		await getProductSupplierTermsStats(database),
	);
}

export async function create(
	input: ProductSupplierTermsCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		await assertAssignableProduct(tx, input.productId);
		await assertAssignableSupplier(tx, input.supplierId);

		const record = await createProductSupplierTerms(tx, input);
		const parsed = parseDetail(record);

		await writeAdminAuditLog(tx, {
			action: "productSupplierTerms.create",
			actor,
			entityType: PRODUCT_SUPPLIER_TERMS_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
		});

		return parsed;
	});
}

export async function update(
	input: ProductSupplierTermsUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findProductSupplierTermsById(tx, input.id);
		if (!beforeRecord) throwNotFound("Terminos de proveedor");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar un termino de proveedor eliminado",
			);
		}

		await assertAssignableProduct(tx, input.productId, before.product.id);
		await assertAssignableSupplier(tx, input.supplierId, before.supplier.id);

		const record = await updateProductSupplierTerms(tx, input);
		const after = parseDetail(record);

		await writeAdminAuditLog(tx, {
			action: "productSupplierTerms.update",
			actor,
			entityType: PRODUCT_SUPPLIER_TERMS_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: ProductSupplierTermsDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findProductSupplierTermsById(tx, input.id);
		if (!beforeRecord) throwNotFound("Terminos de proveedor");
		const before = parseDetail(beforeRecord);

		const record = await softDeleteProductSupplierTerms(tx, input.id);
		const after = parseDetail(record);

		await writeAdminAuditLog(tx, {
			action: "productSupplierTerms.softDelete",
			actor,
			entityType: PRODUCT_SUPPLIER_TERMS_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: ProductSupplierTermsDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const record = await getProductSupplierTermsRelationCounts(tx, input.id);
		if (!record) throwNotFound("Terminos de proveedor");

		if (record._count.lotItems > 0) {
			throw new AdminCrudError(
				"RELATION_BLOCKED",
				buildRelationBlockMessage(record),
			);
		}

		const before = parseDetail(record);
		const deleted = await hardDeleteProductSupplierTerms(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "productSupplierTerms.hardDelete",
			actor,
			entityType: PRODUCT_SUPPLIER_TERMS_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
