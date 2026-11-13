"use client";

import type { CartItem } from "~/shared/common/cart.types";
import type { CatalogProductListItem } from "~/shared/common/catalog.types";
import {
	calculateLineTotal,
	normalizeCartQuantity,
	toNumber,
	toQuantityString,
} from "~/shared/common/commerce.helpers";
import type { HomeOffer } from "~/shared/common/home.types";
import { homeOfferTerms } from "~/shared/common/home-offer-terms";

export { homeOfferTerms };

/**
 * Adds items to a cart keyed by terms id: a line already there grows by the
 * incoming quantity, and every touched line is fitted to its terms.
 */
export function mergeCartItems(
	current: Record<string, CartItem>,
	incoming: CartItem[],
): Record<string, CartItem> {
	const next = { ...current };

	for (const item of incoming) {
		const key = String(item.productClientTermsId);
		const existing = next[key];
		const wanted = existing
			? toQuantityString(
					(toNumber(existing.quantity) ?? 0) + (toNumber(item.quantity) ?? 0),
				)
			: item.quantity;
		const quantity = normalizeCartQuantity(wanted, item.terms);

		next[key] = {
			...item,
			quantity,
			lineTotal: calculateLineTotal(item.terms, quantity),
		};
	}

	return next;
}

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
			presentationContainer: product.presentationContainer,
			presentationSize: product.presentationSize,
			brandName: product.brand?.name ?? null,
			imageUrl: product.imageUrl,
		},
		terms: product.terms,
	};
}

export function homeOfferToCartItem(
	offer: HomeOffer,
	quantity = offer.moq,
): CartItem {
	const terms = homeOfferTerms(offer);
	const normalizedQuantity = normalizeCartQuantity(quantity, terms);
	return {
		productClientTermsId: terms.id,
		quantity: normalizedQuantity,
		lineTotal: calculateLineTotal(terms, normalizedQuantity),
		product: {
			id: offer.productId,
			name: offer.productName,
			description: offer.productDescription,
			unit: offer.unit,
			presentationContainer: offer.presentationContainer,
			presentationSize: offer.presentationSize,
			brandName: offer.brandName,
			imageUrl: offer.imageUrl,
		},
		terms,
	};
}
