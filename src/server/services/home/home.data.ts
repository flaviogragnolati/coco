import "server-only";

import type { Prisma } from "~/prisma/client";
import type { db } from "~/server/db";
import { currentTermsWhere } from "../_base/terms-validity";

type HomeDb = typeof db;

const homeProductBrandSelect = {
	name: true,
} satisfies Prisma.BrandSelect;

const homeOfferProductSelect = {
	id: true,
	name: true,
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
	product: {
		select: homeOfferProductSelect,
	},
} satisfies Prisma.ProductClientTermsSelect;

export type CurrentHomeOfferRecord = Prisma.ProductClientTermsGetPayload<{
	select: typeof currentTermsSelect;
}>;

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
