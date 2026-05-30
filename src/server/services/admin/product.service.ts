import { brandDetailSchema } from "~/schemas/admin/brand.schemas";
import {
	productDetailSchema,
	productListOutputSchema,
	productStatsSchema,
} from "~/schemas/admin/product.schemas";
import type { db } from "~/server/db";
import type {
	ProductBrandAssignment,
	ProductCreateInput,
	ProductDeleteInput,
	ProductDetail,
	ProductListInput,
	ProductStats,
	ProductUpdateInput,
} from "~/shared/common/admin-crud/product.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import { createBrand } from "./brand.data";
import {
	createProduct,
	findProductBrandById,
	findProductById,
	findProductSupplierById,
	getProductRelationCounts,
	getProductStats,
	hardDeleteProduct,
	listProducts,
	type ProductDetailRecord,
	type ProductRelationCountRecord,
	type ProductWriteInput,
	softDeleteProduct,
	updateProduct,
} from "./product.data";

type AdminDb = typeof db;

const PRODUCT_ENTITY = "product";
const BRAND_ENTITY = "brand";

function parseDetail(record: ProductDetailRecord): ProductDetail {
	return productDetailSchema.parse(record);
}

function buildRelationBlockMessage(record: ProductRelationCountRecord) {
	const blockingParts = [
		record._count.productClientTerms > 0
			? `${record._count.productClientTerms} términos de cliente`
			: null,
		record._count.productSupplierTerms > 0
			? `${record._count.productSupplierTerms} términos de proveedor`
			: null,
		record._count.productLocalConstraints > 0
			? `${record._count.productLocalConstraints} restricciones locales`
			: null,
	].filter(Boolean);

	return `No se puede eliminar definitivamente "${record.name}" porque tiene ${blockingParts.join(", ")} relacionados.`;
}

async function resolveBrandId(
	assignment: ProductBrandAssignment,
	actor: AdminMutationActor,
	dbClient: Parameters<AdminDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
	currentBrandId?: number,
) {
	switch (assignment.mode) {
		case "none":
			return undefined;
		case "existing": {
			const brand = await findProductBrandById(dbClient, assignment.brandId);
			if (!brand) throwNotFound("Marca");
			if (brand.deleted && brand.id !== currentBrandId) {
				throw new AdminCrudError(
					"CONFLICT",
					"No se puede asignar una marca eliminada",
				);
			}
			return brand.id;
		}
		case "new": {
			const createdBrand = await createBrand(dbClient, assignment.brand);
			const parsedBrand = brandDetailSchema.parse(createdBrand);

			await writeAdminAuditLog(dbClient, {
				action: "brand.create",
				actor,
				entityType: BRAND_ENTITY,
				entityId: String(parsedBrand.id),
				after: parsedBrand,
				metadata: { inlineFrom: PRODUCT_ENTITY },
			});

			return parsedBrand.id;
		}
	}
}

async function resolveDefaultSupplierId(
	defaultSupplierId: number | undefined,
	dbClient: Parameters<AdminDb["$transaction"]>[0] extends (
		tx: infer T,
	) => unknown
		? T
		: never,
	currentSupplierId?: number,
) {
	if (defaultSupplierId === undefined) {
		return undefined;
	}

	const supplier = await findProductSupplierById(dbClient, defaultSupplierId);
	if (!supplier) throwNotFound("Proveedor");
	if (supplier.deleted && supplier.id !== currentSupplierId) {
		throw new AdminCrudError(
			"CONFLICT",
			"No se puede asignar un proveedor eliminado",
		);
	}

	return supplier.id;
}

function toProductWriteInput(
	input: ProductCreateInput | ProductUpdateInput,
	brandId?: number,
	defaultSupplierId?: number,
): ProductWriteInput {
	return {
		name: input.name,
		description: input.description,
		cartImageUrl: input.cartImageUrl,
		cardImageUrl: input.cardImageUrl,
		images: input.images,
		unit: input.unit,
		brandId,
		defaultSupplierId,
		active: input.active,
	};
}

export async function list(input: ProductListInput, database: AdminDb) {
	const records = await listProducts(database, input);
	return productListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const product = await findProductById(database, id);
	if (!product) throwNotFound("Producto");
	return parseDetail(product);
}

export async function getStats(database: AdminDb): Promise<ProductStats> {
	return productStatsSchema.parse(await getProductStats(database));
}

export async function create(
	input: ProductCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const brandId = await resolveBrandId(input.brandAssignment, actor, tx);
		const defaultSupplierId = await resolveDefaultSupplierId(
			input.defaultSupplierId,
			tx,
		);

		const product = await createProduct(
			tx,
			toProductWriteInput(input, brandId, defaultSupplierId),
		);
		const parsed = parseDetail(product);

		await writeAdminAuditLog(tx, {
			action: "product.create",
			actor,
			entityType: PRODUCT_ENTITY,
			entityId: String(parsed.id),
			after: parsed,
		});

		return parsed;
	});
}

export async function update(
	input: ProductUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findProductById(tx, input.id);
		if (!beforeRecord) throwNotFound("Producto");
		const before = parseDetail(beforeRecord);

		if (before.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede editar un producto eliminado",
			);
		}

		const brandId = await resolveBrandId(
			input.brandAssignment,
			actor,
			tx,
			before.brand?.id,
		);
		const defaultSupplierId = await resolveDefaultSupplierId(
			input.defaultSupplierId,
			tx,
			before.defaultSupplier?.id,
		);

		const product = await updateProduct(tx, {
			id: input.id,
			...toProductWriteInput(input, brandId, defaultSupplierId),
		});
		const after = parseDetail(product);

		await writeAdminAuditLog(tx, {
			action: "product.update",
			actor,
			entityType: PRODUCT_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: ProductDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findProductById(tx, input.id);
		if (!beforeRecord) throwNotFound("Producto");
		const before = parseDetail(beforeRecord);

		const product = await softDeleteProduct(tx, input.id);
		const after = parseDetail(product);

		await writeAdminAuditLog(tx, {
			action: "product.softDelete",
			actor,
			entityType: PRODUCT_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: ProductDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const product = await getProductRelationCounts(tx, input.id);
		if (!product) throwNotFound("Producto");

		const hasRestrictiveRelations =
			product._count.productClientTerms > 0 ||
			product._count.productSupplierTerms > 0 ||
			product._count.productLocalConstraints > 0;

		if (hasRestrictiveRelations) {
			throw new AdminCrudError(
				"RELATION_BLOCKED",
				buildRelationBlockMessage(product),
			);
		}

		const before = parseDetail(product);
		const deleted = await hardDeleteProduct(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "product.hardDelete",
			actor,
			entityType: PRODUCT_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
