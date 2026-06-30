import "server-only";

import {
	catalogProductDetailSchema,
	catalogProductListOutputSchema,
} from "~/schemas/catalog.schemas";
import { db } from "~/server/db";
import type {
	CatalogClientTerms,
	CatalogProductDetail,
	CatalogProductListItem,
} from "~/shared/common/catalog.types";
import {
	type CatalogProductDetailRecord,
	type CatalogProductListRecord,
	findCatalogProductDetail,
	listCatalogProducts,
} from "./catalog.data";

function selectProductImage(product: {
	cardImageUrl: string | null;
	cartImageUrl: string | null;
}) {
	return product.cardImageUrl ?? product.cartImageUrl;
}

function mapTerms(
	terms: CatalogProductListRecord["productClientTerms"][number],
): CatalogClientTerms {
	return {
		id: terms.id,
		moq: terms.moq.toString(),
		moqPrice: terms.moqPrice.toString(),
		step: terms.step?.toString() ?? null,
		stepPrice: terms.stepPrice?.toString() ?? null,
		max: terms.max?.toString() ?? null,
		refPrice: terms.refPrice?.toString() ?? null,
		currency: terms.currency,
		fromDate: terms.fromDate,
		toDate: terms.toDate,
	};
}

function mapListItem(
	record: CatalogProductListRecord,
): CatalogProductListItem | null {
	const terms = record.productClientTerms[0];
	if (!terms) return null;

	return {
		id: record.id,
		name: record.name,
		description: record.description,
		unit: record.unit,
		brand: record.brand,
		imageUrl: selectProductImage(record),
		createdAt: record.createdAt,
		terms: mapTerms(terms),
	};
}

function mapDetail(
	record: CatalogProductDetailRecord,
): CatalogProductDetail | null {
	const listItem = mapListItem(record);
	if (!listItem) return null;

	return {
		...listItem,
		cardImageUrl: record.cardImageUrl,
		cartImageUrl: record.cartImageUrl,
		images: record.images,
	};
}

export async function list() {
	const records = await listCatalogProducts(db, new Date());
	return catalogProductListOutputSchema.parse(
		records.map(mapListItem).filter(Boolean),
	);
}

export async function getProductDetail(id: number) {
	const record = await findCatalogProductDetail(db, id, new Date());
	if (!record) return null;

	const detail = mapDetail(record);
	return detail ? catalogProductDetailSchema.parse(detail) : null;
}
