import "server-only";

import { homeContentOutputSchema } from "~/schemas/home.schemas";
import { db } from "~/server/db";
import { selectProductImage } from "~/shared/common/commerce.helpers";
import type { HomeContent } from "~/shared/common/home.types";
import {
	type CurrentHomeOfferRecord,
	countPaidOrdersByProduct,
	getHomeOfferCuration,
	listCurrentHomeOffers,
} from "./home.data";
import { composeHomeContent, type RankableHomeOffer } from "./home-ranking";

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
		brandName: record.product.brand?.name ?? null,
		imageUrl: selectProductImage(record.product, "catalog"),
		moq: record.moq.toString(),
		moqPrice: record.moqPrice.toString(),
		unitPrice: record.unitPrice?.toString() ?? null,
		marketPrice: record.marketPrice?.toString() ?? null,
		discountPercent: record.discountPercent?.toString() ?? null,
		currency: record.currency,
		homeOfferRank: record.product.homeOfferRank,
		paidOrderCount: paidOrderCounts.get(record.product.id) ?? 0,
		fromDate: record.fromDate,
	};
}

export async function getHomeContent(): Promise<HomeContent> {
	const now = new Date();
	const [records, curation] = await Promise.all([
		listCurrentHomeOffers(db, now),
		getHomeOfferCuration(db),
	]);
	const paidOrderCounts =
		curation.criterion === "orderVolume"
			? await countPaidOrdersByProduct(db, now)
			: new Map<number, number>();

	// The admin pin and the order count never reach the public offer contract.
	return homeContentOutputSchema.parse({
		...composeHomeContent(
			records.map((record) => mapHomeOffer(record, paidOrderCounts)),
			curation,
		),
		offersLimit: curation.offersLimit,
		offersCriterion: curation.criterion,
	});
}
