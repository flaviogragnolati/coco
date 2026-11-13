import "server-only";

import type { Prisma } from "~/prisma/client";
import type { db } from "~/server/db";
import { currentTermsWhere } from "../_base/terms-validity";
import type {
	FeaturedTarget,
	HomeComboRecord,
	HomeFeaturedCuration,
} from "./home-featured";

type HomeDb = typeof db;

const homeProductBrandSelect = {
	name: true,
} satisfies Prisma.BrandSelect;

const homeOfferProductSelect = {
	id: true,
	name: true,
	description: true,
	unit: true,
	presentationContainer: true,
	presentationSize: true,
	cardImageUrl: true,
	cartImageUrl: true,
	brand: {
		select: homeProductBrandSelect,
	},
} satisfies Prisma.ProductSelect;

const currentTermsSelect = {
	id: true,
	fromDate: true,
	toDate: true,
	step: true,
	stepPrice: true,
	max: true,
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

export const ORDER_VOLUME_WINDOW_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Paid means the payment was captured inside the window and the order is still
 * commercially alive: a refund, chargeback or cancellation takes it back out,
 * and so does a request the customer or an admin cancelled.
 */
function paidOrderItemsWhere(since: Date) {
	return {
		userOrder: {
			status: { in: ["processing", "completed"] },
			transactions: {
				some: { status: "completed", completedAt: { gte: since } },
			},
		},
		sourceCartItem: { deleted: false, status: "submitted" },
	} satisfies Prisma.UserOrderItemWhereInput;
}

/**
 * Paid orders per product, not per client terms: terms rotate with every price
 * change and the home ranks products. An order holding the product under two
 * terms rows still counts once.
 */
export async function countPaidOrdersByProduct(
	database: HomeDb,
	now: Date,
): Promise<Map<number, number>> {
	const since = new Date(now.getTime() - ORDER_VOLUME_WINDOW_DAYS * DAY_MS);
	const items = await database.userOrderItem.findMany({
		where: paidOrderItemsWhere(since),
		select: {
			userOrderId: true,
			sourceCartItem: {
				select: { productClientTerms: { select: { productId: true } } },
			},
		},
	});

	const ordersByProduct = new Map<number, Set<number>>();
	for (const item of items) {
		const productId = item.sourceCartItem.productClientTerms.productId;
		const orders = ordersByProduct.get(productId) ?? new Set<number>();
		orders.add(item.userOrderId);
		ordersByProduct.set(productId, orders);
	}

	return new Map(
		[...ordersByProduct].map(([productId, orders]) => [productId, orders.size]),
	);
}

/** Active combos only: an inactive or deleted one never reaches the home. */
export async function listHomeCombos(
	database: HomeDb,
): Promise<HomeComboRecord[]> {
	const combos = await database.combo.findMany({
		where: { active: true, deleted: false },
		orderBy: { id: "asc" },
		select: {
			id: true,
			name: true,
			description: true,
			people: true,
			groupName: true,
			items: {
				orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
				select: {
					productId: true,
					quantity: true,
					product: { select: { name: true } },
				},
			},
		},
	});

	return combos.map((combo) => ({
		...combo,
		items: combo.items.map((item) => ({
			productId: item.productId,
			productName: item.product.name,
			quantity: item.quantity.toString(),
		})),
	}));
}

export function toFeaturedTarget(entry: {
	productId: number | null;
	comboId: number | null;
}): FeaturedTarget | null {
	if (entry.productId !== null) {
		return { kind: "product", productId: entry.productId };
	}
	if (entry.comboId !== null) return { kind: "combo", comboId: entry.comboId };
	return null;
}

export async function listHomeFeaturedList(
	database: HomeDb,
): Promise<FeaturedTarget[]> {
	const entries = await database.homeFeaturedItem.findMany({
		orderBy: [{ position: "asc" }, { id: "asc" }],
		select: { productId: true, comboId: true },
	});
	return entries.flatMap((entry) => toFeaturedTarget(entry) ?? []);
}

export type HomeCurationSettings = Omit<HomeFeaturedCuration, "list">;

// The admin section owns the upsert on the singleton row. Reading the home must
// not create it, so an absent row means "not curated yet" and answers with the
// same defaults the schema would have written.
const uncuratedHomeOffers: HomeCurationSettings = {
	spotlight: null,
	criterion: "marketSaving",
	featuredLimit: 4,
	fillWithRanking: true,
};

export async function getHomeOfferCuration(
	database: HomeDb,
): Promise<HomeCurationSettings> {
	const settings = await database.homeOfferSettings.findUnique({
		where: { id: 1 },
		select: {
			spotlightProductId: true,
			spotlightComboId: true,
			criterion: true,
			offersLimit: true,
			fillWithRanking: true,
		},
	});
	if (!settings) return uncuratedHomeOffers;

	return {
		spotlight: toFeaturedTarget({
			productId: settings.spotlightProductId,
			comboId: settings.spotlightComboId,
		}),
		criterion: settings.criterion,
		featuredLimit: settings.offersLimit,
		fillWithRanking: settings.fillWithRanking,
	};
}
