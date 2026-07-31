import "server-only";

import { homeContentOutputSchema } from "~/schemas/home.schemas";
import { db } from "~/server/db";
import { selectProductImage } from "~/shared/common/commerce.helpers";
import type { HomeContent } from "~/shared/common/home.types";
import {
	type CurrentHomeOfferRecord,
	getHomeOfferCuration,
	listCurrentHomeOffers,
} from "./home.data";
import { composeHomeContent, type RankableHomeOffer } from "./home-ranking";

function mapHomeOffer(record: CurrentHomeOfferRecord): RankableHomeOffer {
	return {
		productId: record.product.id,
		productClientTermsId: record.id,
		productName: record.product.name,
		unit: record.product.unit,
		brandName: record.product.brand?.name ?? null,
		imageUrl: selectProductImage(record.product, "catalog"),
		moq: record.moq.toString(),
		moqPrice: record.moqPrice.toString(),
		unitPrice: record.unitPrice?.toString() ?? null,
		marketPrice: record.marketPrice?.toString() ?? null,
		discountPercent: record.discountPercent?.toString() ?? null,
		currency: record.currency,
		homeOfferRank: record.product.homeOfferRank,
		fromDate: record.fromDate,
	};
}

export async function getHomeContent(): Promise<HomeContent> {
	const now = new Date();
	const [records, curation] = await Promise.all([
		listCurrentHomeOffers(db, now),
		getHomeOfferCuration(db),
	]);

	// `homeOfferSchema` strips the ranking-only fields, so what reaches the
	// components stays the plain offer contract.
	return homeContentOutputSchema.parse(
		composeHomeContent(records.map(mapHomeOffer), curation),
	);
}
