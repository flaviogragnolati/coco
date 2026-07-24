import "server-only";

import { homeOffersOutputSchema } from "~/schemas/home.schemas";
import { db } from "~/server/db";
import { selectProductImage } from "~/shared/common/commerce.helpers";
import type { HomeOffer } from "~/shared/common/home.types";
import {
	type CurrentHomeOfferRecord,
	listCurrentHomeOffers,
} from "./home.data";

function mapHomeOffer(record: CurrentHomeOfferRecord): HomeOffer {
	return {
		productId: record.product.id,
		productClientTermsId: record.id,
		productName: record.product.name,
		unit: record.product.unit,
		brandName: record.product.brand?.name ?? null,
		imageUrl: selectProductImage(record.product, "catalog"),
		moq: record.moq.toString(),
		moqPrice: record.moqPrice.toString(),
		refPrice: record.refPrice?.toString() ?? null,
		currency: record.currency,
	};
}

export async function getHomeOffers(limit = 4) {
	const records = await listCurrentHomeOffers(db, new Date(), limit);
	const uniqueRecords = records.filter(
		(record, index, allRecords) =>
			allRecords.findIndex(
				(candidate) => candidate.product.id === record.product.id,
			) === index,
	);

	return homeOffersOutputSchema.parse(uniqueRecords.map(mapHomeOffer));
}
