import "server-only";

import type { db } from "~/server/db";
import type { Prisma } from "../~/prisma/client";

type HomeDb = typeof db;

const homeProductBrandSelect = {
	name: true,
} satisfies Prisma.BrandSelect;

const homeOfferProductSelect = {
	id: true,
	name: true,
	description: true,
	unit: true,
	cardImageUrl: true,
	cartImageUrl: true,
	brand: {
		select: homeProductBrandSelect,
	},
} satisfies Prisma.ProductSelect;

const currentTermsSelect = {
	id: true,
	moq: true,
	moqPrice: true,
	refPrice: true,
	currency: true,
	fromDate: true,
	toDate: true,
	updatedAt: true,
	product: {
		select: homeOfferProductSelect,
	},
} satisfies Prisma.ProductClientTermsSelect;

const featuredProductSelect = {
	id: true,
	name: true,
	description: true,
	unit: true,
	cardImageUrl: true,
	cartImageUrl: true,
	brand: {
		select: homeProductBrandSelect,
	},
	productClientTerms: {
		select: {
			refPrice: true,
			currency: true,
		},
	},
} satisfies Prisma.ProductSelect;

export type CurrentHomeOfferRecord = Prisma.ProductClientTermsGetPayload<{
	select: typeof currentTermsSelect;
}>;

export type FeaturedHomeProductRecord = Prisma.ProductGetPayload<{
	select: typeof featuredProductSelect;
}>;

function currentTermsWhere(now: Date) {
	return {
		active: true,
		deleted: false,
		fromDate: { lte: now },
		OR: [{ toDate: null }, { toDate: { gte: now } }],
	} satisfies Prisma.ProductClientTermsWhereInput;
}

function currentOffersWhere(now: Date) {
	return {
		...currentTermsWhere(now),
		product: {
			active: true,
			deleted: false,
		},
	} satisfies Prisma.ProductClientTermsWhereInput;
}

export async function listCurrentHomeOffers(
	database: HomeDb,
	now: Date,
	limit: number,
) {
	return await database.productClientTerms.findMany({
		where: currentOffersWhere(now),
		select: currentTermsSelect,
		orderBy: [{ fromDate: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
		take: limit,
	});
}

export async function listFeaturedHomeProducts(
	database: HomeDb,
	now: Date,
	limit: number,
) {
	return database.product.findMany({
		where: {
			active: true,
			deleted: false,
			productClientTerms: {
				some: currentTermsWhere(now),
			},
		},
		select: {
			...featuredProductSelect,
			productClientTerms: {
				where: currentTermsWhere(now),
				select: featuredProductSelect.productClientTerms.select,
				orderBy: [{ fromDate: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
				take: 1,
			},
		},
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		take: limit,
	});
}
