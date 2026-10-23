import {
	getMarketSavingLabel,
	getOfferComparisonPrice,
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
 * The headline is the offer step price and the step it buys ("$ 9.750"
 * "por 500 g"), with the undiscounted step price and discount when there is
 * one; below it, the comparison price per kg or litre when it says something
 * the headline does not.
 */
export function getPurchasePrice(pricing: OfferPricing) {
	const { amount, unitLabel } = getOfferHeadlinePrice(pricing);
	return {
		amount,
		unitLabel,
		previousAmount: getOfferStrikethroughPrice(pricing),
		discount: getOfferDiscountLabel(pricing),
		comparison: getOfferComparisonPrice(pricing),
		saving: SHOW_MARKET_SAVING ? getMarketSavingLabel(pricing) : null,
	};
}
