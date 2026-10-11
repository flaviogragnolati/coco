import {
	getMarketSavingLabel,
	getOfferDiscountLabel,
	getOfferHeadlinePrice,
	getOfferStrikethroughPrice,
	type OfferPricing,
	SHOW_MARKET_SAVING,
} from "~/features/home/home-formatters";
import type {
	CatalogClientTerms,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	isFixedQuantity,
	normalizeCartQuantity,
	type ProductPresentation,
} from "~/shared/common/commerce.helpers";

/** What the panel offers between the price and the action button. */
export type PurchasePanelMode = "in-cart" | "fixed" | "stepper";

export function getPurchasePanelMode(
	terms: CatalogClientTerms,
	inCartQuantity: string | null,
): PurchasePanelMode {
	if (inCartQuantity !== null) return "in-cart";
	return isFixedQuantity(terms) ? "fixed" : "stepper";
}

export function getInitialPurchaseQuantity(terms: CatalogClientTerms) {
	return normalizeCartQuantity(terms.moq, terms);
}

export function toOfferPricing(
	terms: CatalogClientTerms,
	unit: CatalogProductUnit,
	presentation: ProductPresentation,
): OfferPricing {
	return {
		...terms,
		unit,
		presentationContainer: presentation.presentationContainer,
		presentationSize: presentation.presentationSize,
	};
}

/**
 * The single price line: the offer unit price and what it is per ("$ 19.500"
 * "por kg"), with the undiscounted price and discount when there is one.
 */
export function getPurchasePrice(pricing: OfferPricing) {
	const { amount, unitLabel } = getOfferHeadlinePrice(pricing);
	return {
		amount,
		unitLabel,
		previousAmount: getOfferStrikethroughPrice(pricing),
		discount: getOfferDiscountLabel(pricing),
		saving: SHOW_MARKET_SAVING ? getMarketSavingLabel(pricing) : null,
	};
}
