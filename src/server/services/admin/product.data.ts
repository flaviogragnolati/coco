import type { Prisma } from "~/prisma/client";
import type {
	ProductListInput,
	ProductUnit,
} from "~/shared/common/admin-crud/product.types";

type AdminDbClient = Prisma.TransactionClient;

const productBrandReferenceSelect = {
	id: true,
	name: true,
	deleted: true,
} satisfies Prisma.BrandSelect;

const productSupplierReferenceSelect = {
	id: true,
	name: true,
	deleted: true,
} satisfies Prisma.SupplierSelect;

export const productListSelect = {
	id: true,
	name: true,
	description: true,
	unit: true,
	cartImageUrl: true,
	brand: {
		select: productBrandReferenceSelect,
	},
	defaultSupplier: {
		select: productSupplierReferenceSelect,
	},
	active: true,
	deleted: true,
	updatedAt: true,
} satisfies Prisma.ProductSelect;

export const productDetailSelect = {
	id: true,
	name: true,
	description: true,
	cartImageUrl: true,
	cardImageUrl: true,
	images: true,
	unit: true,
	brand: {
		select: productBrandReferenceSelect,
	},
	defaultSupplier: {
		select: productSupplierReferenceSelect,
	},
	active: true,
	deleted: true,
} satisfies Prisma.ProductSelect;

const productRelationCountSelect = {
	id: true,
	name: true,
	description: true,
	cartImageUrl: true,
	cardImageUrl: true,
	images: true,
	unit: true,
	brand: {
		select: productBrandReferenceSelect,
	},
	defaultSupplier: {
		select: productSupplierReferenceSelect,
	},
	active: true,
	deleted: true,
	_count: {
		select: {
			productClientTerms: true,
			productSupplierTerms: true,
			productLocalConstraints: true,
		},
	},
} satisfies Prisma.ProductSelect;

export type ProductWriteInput = {
	name: string;
	description?: string;
	cartImageUrl?: string;
	cardImageUrl?: string;
	images: string[];
	unit: ProductUnit;
	brandId?: number;
	defaultSupplierId?: number;
	active: boolean;
};

export type ProductDetailRecord = Prisma.ProductGetPayload<{
	select: typeof productDetailSelect;
}>;

export type ProductRelationCountRecord = Prisma.ProductGetPayload<{
	select: typeof productRelationCountSelect;
}>;

export type ProductBrandReferenceRecord = Prisma.BrandGetPayload<{
	select: typeof productBrandReferenceSelect;
}>;

export type ProductSupplierReferenceRecord = Prisma.SupplierGetPayload<{
	select: typeof productSupplierReferenceSelect;
}>;

export async function listProducts(db: AdminDbClient, input: ProductListInput) {
	return db.product.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: productListSelect,
		orderBy: [{ deleted: "asc" }, { active: "desc" }, { name: "asc" }],
	});
}

export async function findProductById(db: AdminDbClient, id: number) {
	return db.product.findUnique({
		where: { id },
		select: productDetailSelect,
	});
}

export async function getProductStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.product.count(),
		db.product.count({ where: { active: true, deleted: false } }),
		db.product.count({ where: { active: false, deleted: false } }),
		db.product.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createProduct(
	db: AdminDbClient,
	input: ProductWriteInput,
) {
	return db.product.create({
		data: {
			name: input.name,
			description: input.description ?? null,
			cartImageUrl: input.cartImageUrl ?? null,
			cardImageUrl: input.cardImageUrl ?? null,
			images: input.images,
			unit: input.unit,
			brandId: input.brandId ?? null,
			defaultSupplierId: input.defaultSupplierId ?? null,
			active: input.active,
			deleted: false,
		},
		select: productDetailSelect,
	});
}

export async function updateProduct(
	db: AdminDbClient,
	input: ProductWriteInput & { id: number },
) {
	return db.product.update({
		where: { id: input.id },
		data: {
			name: input.name,
			description: input.description ?? null,
			cartImageUrl: input.cartImageUrl ?? null,
			cardImageUrl: input.cardImageUrl ?? null,
			images: input.images,
			unit: input.unit,
			brandId: input.brandId ?? null,
			defaultSupplierId: input.defaultSupplierId ?? null,
			active: input.active,
		},
		select: productDetailSelect,
	});
}

export async function softDeleteProduct(db: AdminDbClient, id: number) {
	return db.product.update({
		where: { id },
		data: {
			active: false,
			deleted: true,
		},
		select: productDetailSelect,
	});
}

export async function hardDeleteProduct(db: AdminDbClient, id: number) {
	return db.product.delete({
		where: { id },
		select: { id: true },
	});
}

export async function getProductRelationCounts(db: AdminDbClient, id: number) {
	return db.product.findUnique({
		where: { id },
		select: productRelationCountSelect,
	});
}

export async function findProductBrandById(db: AdminDbClient, id: number) {
	return db.brand.findUnique({
		where: { id },
		select: productBrandReferenceSelect,
	});
}

export async function findProductSupplierById(db: AdminDbClient, id: number) {
	return db.supplier.findUnique({
		where: { id },
		select: productSupplierReferenceSelect,
	});
}
