import type {
	ProductSupplierTermsCreateInput,
	ProductSupplierTermsListInput,
	ProductSupplierTermsUpdateInput,
} from "~/shared/common/admin-crud/product-supplier-terms.types";
import type { Prisma } from "../~/prisma/client";

type AdminDbClient = Prisma.TransactionClient;

const productReferenceSelect = {
	id: true,
	name: true,
	unit: true,
	deleted: true,
} satisfies Prisma.ProductSelect;

const supplierReferenceSelect = {
	id: true,
	name: true,
	deleted: true,
} satisfies Prisma.SupplierSelect;

export const productSupplierTermsListSelect = {
	id: true,
	product: {
		select: productReferenceSelect,
	},
	supplier: {
		select: supplierReferenceSelect,
	},
	moq: true,
	moqPrice: true,
	step: true,
	stepPrice: true,
	max: true,
	refPrice: true,
	currency: true,
	active: true,
	deleted: true,
	fromDate: true,
	toDate: true,
	updatedAt: true,
} satisfies Prisma.ProductSupplierTermsSelect;

export const productSupplierTermsDetailSelect = {
	id: true,
	product: {
		select: productReferenceSelect,
	},
	supplier: {
		select: supplierReferenceSelect,
	},
	moq: true,
	moqPrice: true,
	step: true,
	stepPrice: true,
	max: true,
	refPrice: true,
	currency: true,
	active: true,
	deleted: true,
	fromDate: true,
	toDate: true,
} satisfies Prisma.ProductSupplierTermsSelect;

const productSupplierTermsRelationCountSelect = {
	...productSupplierTermsDetailSelect,
	_count: {
		select: {
			lotItems: true,
		},
	},
} satisfies Prisma.ProductSupplierTermsSelect;

export type ProductSupplierTermsDetailRecord =
	Prisma.ProductSupplierTermsGetPayload<{
		select: typeof productSupplierTermsDetailSelect;
	}>;

export type ProductSupplierTermsRelationCountRecord =
	Prisma.ProductSupplierTermsGetPayload<{
		select: typeof productSupplierTermsRelationCountSelect;
	}>;

export async function listProductSupplierTerms(
	db: AdminDbClient,
	input: ProductSupplierTermsListInput,
) {
	return db.productSupplierTerms.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: productSupplierTermsListSelect,
		orderBy: [
			{ deleted: "asc" },
			{ active: "desc" },
			{ fromDate: "desc" },
			{ id: "desc" },
		],
	});
}

export async function findProductSupplierTermsById(
	db: AdminDbClient,
	id: number,
) {
	return db.productSupplierTerms.findUnique({
		where: { id },
		select: productSupplierTermsDetailSelect,
	});
}

export async function getProductSupplierTermsStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.productSupplierTerms.count(),
		db.productSupplierTerms.count({ where: { active: true, deleted: false } }),
		db.productSupplierTerms.count({ where: { active: false, deleted: false } }),
		db.productSupplierTerms.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createProductSupplierTerms(
	db: AdminDbClient,
	input: ProductSupplierTermsCreateInput,
) {
	return db.productSupplierTerms.create({
		data: {
			productId: input.productId,
			supplierId: input.supplierId,
			moq: input.moq,
			moqPrice: input.moqPrice,
			step: input.step ?? null,
			stepPrice: input.stepPrice ?? null,
			max: input.max ?? null,
			refPrice: input.refPrice ?? null,
			currency: input.currency,
			active: input.active,
			deleted: false,
			fromDate: new Date(input.fromDate),
			toDate: input.toDate ? new Date(input.toDate) : null,
		},
		select: productSupplierTermsDetailSelect,
	});
}

export async function updateProductSupplierTerms(
	db: AdminDbClient,
	input: ProductSupplierTermsUpdateInput,
) {
	return db.productSupplierTerms.update({
		where: { id: input.id },
		data: {
			productId: input.productId,
			supplierId: input.supplierId,
			moq: input.moq,
			moqPrice: input.moqPrice,
			step: input.step ?? null,
			stepPrice: input.stepPrice ?? null,
			max: input.max ?? null,
			refPrice: input.refPrice ?? null,
			currency: input.currency,
			active: input.active,
			fromDate: new Date(input.fromDate),
			toDate: input.toDate ? new Date(input.toDate) : null,
		},
		select: productSupplierTermsDetailSelect,
	});
}

export async function softDeleteProductSupplierTerms(
	db: AdminDbClient,
	id: number,
) {
	return db.productSupplierTerms.update({
		where: { id },
		data: {
			active: false,
			deleted: true,
		},
		select: productSupplierTermsDetailSelect,
	});
}

export async function hardDeleteProductSupplierTerms(
	db: AdminDbClient,
	id: number,
) {
	return db.productSupplierTerms.delete({
		where: { id },
		select: { id: true },
	});
}

export async function getProductSupplierTermsRelationCounts(
	db: AdminDbClient,
	id: number,
) {
	return db.productSupplierTerms.findUnique({
		where: { id },
		select: productSupplierTermsRelationCountSelect,
	});
}

export async function findProductSupplierTermsProductById(
	db: AdminDbClient,
	id: number,
) {
	return db.product.findUnique({
		where: { id },
		select: productReferenceSelect,
	});
}

export async function findProductSupplierTermsSupplierById(
	db: AdminDbClient,
	id: number,
) {
	return db.supplier.findUnique({
		where: { id },
		select: supplierReferenceSelect,
	});
}
