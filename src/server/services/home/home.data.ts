import "server-only";

import type { Prisma } from "~/prisma/client";
import type { db } from "~/server/db";
import { currentTermsWhere } from "../_base/terms-validity";
import type { HomeOfferCuration } from "./home-ranking";

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
	homeOfferRank: true,
	brand: {
		select: homeProductBrandSelect,
	},
} satisfies Prisma.ProductSelect;

const currentTermsSelect = {
	id: true,
	fromDate: true,
	moq: true,
	moqPrice: true,
	unitPrice: true,
	marketPrice: true,
	discountPercent: true,
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

// No `take`: curation decides which of the current offers reach the home, so
// the ranking must see all of them.
export async function listCurrentHomeOffers(database: HomeDb, now: Date) {
	return await database.productClientTerms.findMany({
		where: currentOffersWhere(now),
		select: currentTermsSelect,
		orderBy: [{ fromDate: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
	});
}

// The admin section owns the upsert on the singleton row. Reading the home must
// not create it, so an absent row means "not curated yet" and answers with the
// same defaults the schema would have written.
const uncuratedHomeOffers: HomeOfferCuration = {
	spotlightProductId: null,
	criterion: "marketSaving",
	offersLimit: 4,
};

export async function getHomeOfferCuration(
	database: HomeDb,
): Promise<HomeOfferCuration> {
	const settings = await database.homeOfferSettings.findUnique({
		where: { id: 1 },
		select: { spotlightProductId: true, criterion: true, offersLimit: true },
	});

	return settings ?? uncuratedHomeOffers;
}
