import type { Prisma } from "~/prisma/client";
import type { HomeOffersCriterion } from "~/shared/common/admin-crud/home-offers.types";
import { currentTermsWhere } from "../_base/terms-validity";

type AdminDbClient = Prisma.TransactionClient;

const HOME_OFFER_SETTINGS_ID = 1;

const homeOfferSettingsSelect = {
	spotlightProductId: true,
	criterion: true,
	offersLimit: true,
	updatedAt: true,
} satisfies Prisma.HomeOfferSettingsSelect;

const homeOfferProductSelect = {
	id: true,
	name: true,
	active: true,
	deleted: true,
	homeOfferRank: true,
} satisfies Prisma.ProductSelect;

const homeOfferPinnedProductSelect = {
	id: true,
	name: true,
	unit: true,
	homeOfferRank: true,
	brand: { select: { name: true } },
} satisfies Prisma.ProductSelect;

const homeOfferCandidateTermsSelect = {
	id: true,
	fromDate: true,
	moq: true,
	moqPrice: true,
	unitPrice: true,
	marketPrice: true,
	discountPercent: true,
	currency: true,
	toDate: true,
	product: {
		select: {
			id: true,
			name: true,
			unit: true,
			homeOfferRank: true,
			brand: { select: { name: true } },
		},
	},
} satisfies Prisma.ProductClientTermsSelect;

export type HomeOfferSettingsRecord = Prisma.HomeOfferSettingsGetPayload<{
	select: typeof homeOfferSettingsSelect;
}>;

export type HomeOfferProductRecord = Prisma.ProductGetPayload<{
	select: typeof homeOfferProductSelect;
}>;

export type HomeOfferPinnedProductRecord = Prisma.ProductGetPayload<{
	select: typeof homeOfferPinnedProductSelect;
}>;

export type HomeOfferCandidateTermsRecord =
	Prisma.ProductClientTermsGetPayload<{
		select: typeof homeOfferCandidateTermsSelect;
	}>;

type HomeOfferSettingsWrite = {
	criterion?: HomeOffersCriterion;
	offersLimit?: number;
	spotlightProductId?: number | null;
};

/**
 * Every read and write goes through the same upsert on `id: 1`: the settings
 * are a singleton, so a fresh database must answer with the defaults instead of
 * forcing each caller to handle a missing row.
 */
export async function upsertHomeOfferSettings(
	db: AdminDbClient,
	data: HomeOfferSettingsWrite = {},
) {
	return db.homeOfferSettings.upsert({
		where: { id: HOME_OFFER_SETTINGS_ID },
		create: { id: HOME_OFFER_SETTINGS_ID, ...data },
		update: data,
		select: homeOfferSettingsSelect,
	});
}

export async function findHomeOfferProduct(db: AdminDbClient, id: number) {
	return db.product.findUnique({
		where: { id },
		select: homeOfferProductSelect,
	});
}

export async function setProductHomeOfferRank(
	db: AdminDbClient,
	id: number,
	rank: number | null,
) {
	return db.product.update({
		where: { id },
		data: { homeOfferRank: rank },
		select: homeOfferProductSelect,
	});
}

export async function countCurrentClientTerms(
	db: AdminDbClient,
	productId: number,
	now: Date,
) {
	return db.productClientTerms.count({
		where: {
			...currentTermsWhere(now),
			productId,
			product: { active: true, deleted: false },
		},
	});
}

export async function listPinnedProducts(db: AdminDbClient) {
	return db.product.findMany({
		where: { homeOfferRank: { not: null } },
		select: homeOfferPinnedProductSelect,
		orderBy: [{ homeOfferRank: "asc" }, { id: "asc" }],
	});
}

export async function listHomeOfferCandidateTerms(
	db: AdminDbClient,
	now: Date,
) {
	return db.productClientTerms.findMany({
		where: {
			...currentTermsWhere(now),
			product: { active: true, deleted: false },
		},
		select: homeOfferCandidateTermsSelect,
		orderBy: [{ fromDate: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
	});
}
