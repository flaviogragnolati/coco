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
	description: true,
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
