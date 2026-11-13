import "server-only";

import { homeContentOutputSchema } from "~/schemas/home.schemas";
import { db } from "~/server/db";
import { selectProductImage } from "~/shared/common/commerce.helpers";
import type { FaqPickupPoint, HomeContent } from "~/shared/common/home.types";
import { toCatalogCategory } from "../_base/catalog-category.mapper";
import {
	type CurrentHomeOfferRecord,
	countPaidOrdersByProduct,
	getHomeOfferCuration,
	listCurrentHomeOffers,
	listFaqPickupPoints,
	listHomeCombos,
	listHomeFeaturedList,
} from "./home.data";
import {
	type ComposedHomeFeatured,
	composeHomeFeatured,
} from "./home-featured";
import type { RankableHomeOffer } from "./home-ranking";

function mapHomeOffer(
	record: CurrentHomeOfferRecord,
	paidOrderCounts: ReadonlyMap<number, number>,
): RankableHomeOffer {
	return {
		productId: record.product.id,
		productClientTermsId: record.id,
		productName: record.product.name,
		productDescription: record.product.description,
		step: record.step?.toString() ?? null,
		stepPrice: record.stepPrice?.toString() ?? null,
		max: record.max?.toString() ?? null,
		toDate: record.toDate,
		unit: record.product.unit,
		presentationContainer: record.product.presentationContainer,
		presentationSize: record.product.presentationSize,
		brandName: record.product.brand?.name ?? null,
		imageUrl: selectProductImage(record.product, "catalog"),
		photoBackgroundColor:
			toCatalogCategory(record.product.category)?.photoBackgroundColor ?? null,
		moq: record.moq.toString(),
		moqPrice: record.moqPrice.toString(),
		unitPrice: record.unitPrice?.toString() ?? null,
		marketPrice: record.marketPrice?.toString() ?? null,
		discountPercent: record.discountPercent?.toString() ?? null,
		currency: record.currency,
		paidOrderCount: paidOrderCounts.get(record.product.id) ?? 0,
		fromDate: record.fromDate,
	};
}

/**
 * The home's band and featured section with where each entry came from. The
 * admin preview reads this same result, so it cannot disagree with the home.
 */
export async function composeCurrentHomeFeatured(
	database: typeof db = db,
): Promise<ComposedHomeFeatured> {
	const now = new Date();
	const [records, combos, list, settings] = await Promise.all([
		listCurrentHomeOffers(database, now),
		listHomeCombos(database),
		listHomeFeaturedList(database),
		getHomeOfferCuration(database),
	]);
	// Only the ranking reads paid orders, and the ranking is off without the fill.
	const paidOrderCounts =
		settings.fillWithRanking && settings.criterion === "orderVolume"
			? await countPaidOrdersByProduct(database, now)
			: new Map<number, number>();

	return composeHomeFeatured(
		records.map((record) => mapHomeOffer(record, paidOrderCounts)),
		combos,
		{ ...settings, list },
	);
}

export async function getHomeContent(): Promise<HomeContent> {
	// The schema strips the order count and the source from the public contract.
	return homeContentOutputSchema.parse(await composeCurrentHomeFeatured());
}

export async function getFaqPickupPoints(): Promise<FaqPickupPoint[]> {
	return listFaqPickupPoints(db);
}
