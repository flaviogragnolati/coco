import "server-only";

import {
	catalogProductDetailSchema,
	catalogProductListOutputSchema,
} from "~/schemas/catalog.schemas";
import { db } from "~/server/db";
import type {
	CatalogProductDetail,
	CatalogProductListItem,
} from "~/shared/common/catalog.types";
import { selectProductImage } from "~/shared/common/commerce.helpers";
import { termsToClientTerms } from "../_base/client-terms.mapper";
import {
	type CatalogProductDetailRecord,
	type CatalogProductListRecord,
	findCatalogProductDetail,
	listCatalogProducts,
} from "./catalog.data";

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
		imageUrl: selectProductImage(record, "catalog"),
		createdAt: record.createdAt,
		terms: termsToClientTerms(terms),
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
