"use client";

import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import {
	calculateLineTotal,
	normalizeCartQuantity,
} from "~/shared/common/commerce.helpers";

export function catalogProductToCartItem(
	product: CatalogProductListItem,
	quantity = product.terms.moq,
): CartItem {
	const normalizedQuantity = normalizeCartQuantity(quantity, product.terms);

	return {
		productClientTermsId: product.terms.id,
		quantity: normalizedQuantity,
		lineTotal: calculateLineTotal(product.terms, normalizedQuantity),
		product: {
			id: product.id,
			name: product.name,
			description: product.description,
			unit: product.unit,
			brandName: product.brand?.name ?? null,
			imageUrl: product.imageUrl,
		},
		terms: product.terms,
	};
}
