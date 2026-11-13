import type { Prisma } from "~/prisma/client";
import type { HomeOffersCriterion } from "~/shared/common/admin-crud/home-offers.types";
import { currentTermsWhere } from "../_base/terms-validity";

type AdminDbClient = Prisma.TransactionClient;

const HOME_OFFER_SETTINGS_ID = 1;

const homeOfferSettingsSelect = {
	spotlightProductId: true,
	spotlightComboId: true,
	criterion: true,
	offersLimit: true,
	fillWithRanking: true,
	updatedAt: true,
} satisfies Prisma.HomeOfferSettingsSelect;

const homeOfferProductSelect = {
	id: true,
	name: true,
	active: true,
	deleted: true,
} satisfies Prisma.ProductSelect;

const homeFeaturedComboSelect = {
	id: true,
	name: true,
	active: true,
	deleted: true,
	groupName: true,
	items: { select: { productId: true } },
} satisfies Prisma.ComboSelect;

const homeFeaturedItemSelect = {
	id: true,
	position: true,
	productId: true,
	comboId: true,
	product: { select: homeOfferProductSelect },
	combo: { select: homeFeaturedComboSelect },
} satisfies Prisma.HomeFeaturedItemSelect;

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

export type HomeFeaturedComboRecord = Prisma.ComboGetPayload<{
	select: typeof homeFeaturedComboSelect;
}>;

export type HomeFeaturedItemRecord = Prisma.HomeFeaturedItemGetPayload<{
	select: typeof homeFeaturedItemSelect;
}>;

export type HomeOfferCandidateTermsRecord =
	Prisma.ProductClientTermsGetPayload<{
		select: typeof homeOfferCandidateTermsSelect;
	}>;

type HomeOfferSettingsWrite = {
	criterion?: HomeOffersCriterion;
	offersLimit?: number;
	fillWithRanking?: boolean;
	spotlightProductId?: number | null;
	spotlightComboId?: number | null;
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

export async function findHomeFeaturedCombo(db: AdminDbClient, id: number) {
	return db.combo.findUnique({
		where: { id },
		select: homeFeaturedComboSelect,
	});
}

export async function listFeaturedItems(db: AdminDbClient) {
	return db.homeFeaturedItem.findMany({
		select: homeFeaturedItemSelect,
		orderBy: [{ position: "asc" }, { id: "asc" }],
	});
}

export async function findFeaturedItemByTarget(
	db: AdminDbClient,
	target: { productId: number } | { comboId: number },
) {
	return db.homeFeaturedItem.findFirst({
		where: target,
		select: { id: true },
	});
}

/** Appends to the end of the list. */
export async function createFeaturedItem(
	db: AdminDbClient,
	target: { productId: number } | { comboId: number },
) {
	const last = await db.homeFeaturedItem.aggregate({
		_max: { position: true },
	});
	return db.homeFeaturedItem.create({
		data: { ...target, position: (last._max.position ?? 0) + 1 },
		select: homeFeaturedItemSelect,
	});
}

export async function deleteFeaturedItem(db: AdminDbClient, id: number) {
	return db.homeFeaturedItem.delete({
		where: { id },
		select: homeFeaturedItemSelect,
	});
}

/** Positions become 1..n in the given order; the caller holds the transaction. */
export async function rewriteFeaturedPositions(
	db: AdminDbClient,
	ids: number[],
) {
	for (const [index, id] of ids.entries()) {
		await db.homeFeaturedItem.update({
			where: { id },
			data: { position: index + 1 },
		});
	}
}

export async function listComboCandidates(db: AdminDbClient) {
	return db.combo.findMany({
		where: { deleted: false },
		select: {
			id: true,
			name: true,
			people: true,
			groupName: true,
			active: true,
		},
		orderBy: [{ groupName: "asc" }, { people: "asc" }, { name: "asc" }],
	});
}

/** Active combos with their products, to tell which group cards can show. */
export async function listActiveComboGroups(db: AdminDbClient) {
	return db.combo.findMany({
		where: { active: true, deleted: false },
		select: homeFeaturedComboSelect,
	});
}
