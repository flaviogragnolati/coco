import "server-only";

import {
	homeFeaturedProductsOutputSchema,
	homeOffersOutputSchema,
} from "~/schemas/home.schemas";
import { db } from "~/server/db";
import type {
	HomeFeaturedProduct,
	HomeOffer,
} from "~/shared/common/home.types";
import {
	type CurrentHomeOfferRecord,
	type FeaturedHomeProductRecord,
	listCurrentHomeOffers,
	listFeaturedHomeProducts,
} from "./home.data";

function selectProductImage(product: {
	cardImageUrl: string | null;
	cartImageUrl: string | null;
}) {
	return product.cardImageUrl ?? product.cartImageUrl;
}

function mapHomeOffer(record: CurrentHomeOfferRecord): HomeOffer {
	return {
		id: record.id,
		productName: record.product.name,
		productDescription: record.product.description,
		unit: record.product.unit,
		brandName: record.product.brand?.name ?? null,
		imageUrl: selectProductImage(record.product),
		moq: record.moq.toString(),
		moqPrice: record.moqPrice.toString(),
		refPrice: record.refPrice?.toString() ?? null,
		currency: record.currency,
		fromDate: record.fromDate,
		toDate: record.toDate,
	};
}

function mapFeaturedProduct(
	record: FeaturedHomeProductRecord,
): HomeFeaturedProduct {
	const terms = record.productClientTerms[0];

	return {
		id: record.id,
		productName: record.name,
		productDescription: record.description,
		unit: record.unit,
		brandName: record.brand?.name ?? null,
		imageUrl: selectProductImage(record),
		refPrice: terms?.refPrice?.toString() ?? null,
		currency: terms?.currency ?? null,
	};
}

export async function getHomeOffers(limit = 4) {
	const records = await listCurrentHomeOffers(db, new Date(), limit);
	return homeOffersOutputSchema.parse(records.map(mapHomeOffer));
}

export async function getHomeFeaturedProducts(limit = 3) {
	const records = await listFeaturedHomeProducts(db, new Date(), limit);
	return homeFeaturedProductsOutputSchema.parse(
		records.map(mapFeaturedProduct),
	);
}
