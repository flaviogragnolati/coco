"use client";

import type { CartItem } from "~/shared/common/cart.types";
import type {
	CatalogClientTerms,
	CatalogProductListItem,
} from "~/shared/common/catalog.types";
import {
	calculateLineTotal,
	normalizeCartQuantity,
} from "~/shared/common/commerce.helpers";
import type { HomeOffer } from "~/shared/common/home.types";

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

function homeOfferTerms(offer: HomeOffer): CatalogClientTerms {
	return {
		id: offer.productClientTermsId,
		moq: offer.moq,
		moqPrice: offer.moqPrice,
		step: offer.step,
		stepPrice: offer.stepPrice,
		max: offer.max,
		unitPrice: offer.unitPrice,
		marketPrice: offer.marketPrice,
		discountPercent: offer.discountPercent,
		currency: offer.currency,
		fromDate: offer.fromDate,
		toDate: offer.toDate,
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
			brandName: offer.brandName,
			imageUrl: offer.imageUrl,
		},
		terms,
	};
}
