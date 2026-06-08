import type { Prisma } from "~/prisma/client";
import type {
	ProductClientTermsCreateInput,
	ProductClientTermsListInput,
	ProductClientTermsUpdateInput,
} from "~/shared/common/admin-crud/product-client-terms.types";

type AdminDbClient = Prisma.TransactionClient;

const productReferenceSelect = {
	id: true,
	name: true,
	unit: true,
	deleted: true,
} satisfies Prisma.ProductSelect;

export const productClientTermsListSelect = {
	id: true,
	product: {
		select: productReferenceSelect,
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
} satisfies Prisma.ProductClientTermsSelect;

export const productClientTermsDetailSelect = {
	id: true,
	product: {
		select: productReferenceSelect,
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
} satisfies Prisma.ProductClientTermsSelect;

const productClientTermsRelationCountSelect = {
	...productClientTermsDetailSelect,
	_count: {
		select: {
			cartItems: true,
		},
	},
} satisfies Prisma.ProductClientTermsSelect;

export type ProductClientTermsDetailRecord =
	Prisma.ProductClientTermsGetPayload<{
		select: typeof productClientTermsDetailSelect;
	}>;

export type ProductClientTermsRelationCountRecord =
	Prisma.ProductClientTermsGetPayload<{
		select: typeof productClientTermsRelationCountSelect;
	}>;

export async function listProductClientTerms(
	db: AdminDbClient,
	input: ProductClientTermsListInput,
) {
	return db.productClientTerms.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: productClientTermsListSelect,
		orderBy: [
			{ deleted: "asc" },
			{ active: "desc" },
			{ fromDate: "desc" },
			{ id: "desc" },
		],
	});
}

export async function findProductClientTermsById(
	db: AdminDbClient,
	id: number,
) {
	return db.productClientTerms.findUnique({
		where: { id },
		select: productClientTermsDetailSelect,
	});
}

export async function getProductClientTermsStats(db: AdminDbClient) {
	const [total, active, inactive, deleted] = await Promise.all([
		db.productClientTerms.count(),
		db.productClientTerms.count({ where: { active: true, deleted: false } }),
		db.productClientTerms.count({ where: { active: false, deleted: false } }),
		db.productClientTerms.count({ where: { deleted: true } }),
	]);

	return { total, active, inactive, deleted };
}

export async function createProductClientTerms(
	db: AdminDbClient,
	input: ProductClientTermsCreateInput,
) {
	return db.productClientTerms.create({
		data: {
			productId: input.productId,
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
		select: productClientTermsDetailSelect,
	});
}

export async function updateProductClientTerms(
	db: AdminDbClient,
	input: ProductClientTermsUpdateInput,
) {
	return db.productClientTerms.update({
		where: { id: input.id },
		data: {
			productId: input.productId,
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
		select: productClientTermsDetailSelect,
	});
}

export async function softDeleteProductClientTerms(
	db: AdminDbClient,
	id: number,
) {
	return db.productClientTerms.update({
		where: { id },
		data: {
			active: false,
			deleted: true,
		},
		select: productClientTermsDetailSelect,
	});
}

export async function hardDeleteProductClientTerms(
	db: AdminDbClient,
	id: number,
) {
	return db.productClientTerms.delete({
		where: { id },
		select: { id: true },
	});
}

export async function getProductClientTermsRelationCounts(
	db: AdminDbClient,
	id: number,
) {
	return db.productClientTerms.findUnique({
		where: { id },
		select: productClientTermsRelationCountSelect,
	});
}

export async function findProductClientTermsProductById(
	db: AdminDbClient,
	id: number,
) {
	return db.product.findUnique({
		where: { id },
		select: productReferenceSelect,
	});
}
