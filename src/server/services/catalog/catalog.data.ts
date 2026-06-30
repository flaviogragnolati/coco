import "server-only";

import type { Prisma } from "~/prisma/client";
import type { db } from "~/server/db";

type CatalogDb = typeof db;

const catalogBrandSelect = {
	id: true,
	name: true,
} satisfies Prisma.BrandSelect;

const catalogClientTermsSelect = {
	id: true,
	moq: true,
	moqPrice: true,
	step: true,
	stepPrice: true,
	max: true,
	refPrice: true,
	currency: true,
	fromDate: true,
	toDate: true,
	updatedAt: true,
} satisfies Prisma.ProductClientTermsSelect;

const catalogProductBaseSelect = {
	id: true,
	name: true,
	description: true,
	unit: true,
	cardImageUrl: true,
	cartImageUrl: true,
	createdAt: true,
	brand: {
		select: catalogBrandSelect,
	},
} satisfies Prisma.ProductSelect;

const catalogProductListSelect = {
	...catalogProductBaseSelect,
	productClientTerms: {
		select: catalogClientTermsSelect,
	},
} satisfies Prisma.ProductSelect;

const catalogProductDetailSelect = {
	...catalogProductBaseSelect,
	images: true,
	productClientTerms: {
		select: catalogClientTermsSelect,
	},
} satisfies Prisma.ProductSelect;

export type CatalogProductListRecord = Prisma.ProductGetPayload<{
	select: typeof catalogProductListSelect;
}>;

export type CatalogProductDetailRecord = Prisma.ProductGetPayload<{
	select: typeof catalogProductDetailSelect;
}>;

export function currentCatalogTermsWhere(now: Date) {
	return {
		active: true,
		deleted: false,
		fromDate: { lte: now },
		OR: [{ toDate: null }, { toDate: { gte: now } }],
	} satisfies Prisma.ProductClientTermsWhereInput;
}

function catalogProductWhere(now: Date): Prisma.ProductWhereInput {
	return {
		active: true,
		deleted: false,
		productClientTerms: {
			some: currentCatalogTermsWhere(now),
		},
	};
}

export async function listCatalogProducts(database: CatalogDb, now: Date) {
	return database.product.findMany({
		where: catalogProductWhere(now),
		select: {
			...catalogProductListSelect,
			productClientTerms: {
				where: currentCatalogTermsWhere(now),
				select: catalogClientTermsSelect,
				orderBy: [{ fromDate: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
				take: 1,
			},
		},
		orderBy: [{ name: "asc" }, { id: "asc" }],
	});
}

export async function findCatalogProductDetail(
	database: CatalogDb,
	id: number,
	now: Date,
) {
	return database.product.findFirst({
		where: {
			...catalogProductWhere(now),
			id,
		},
		select: {
			...catalogProductDetailSelect,
			productClientTerms: {
				where: currentCatalogTermsWhere(now),
				select: catalogClientTermsSelect,
				orderBy: [{ fromDate: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
				take: 1,
			},
		},
	});
}
