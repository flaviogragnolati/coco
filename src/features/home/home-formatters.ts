import type {
	CatalogClientTerms,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	calculateLineTotal,
	formatCurrency,
	formatQuantity,
	formatQuantityInput,
	formatUnitLabel,
	getBaseStepPrice,
	getComparisonPrice,
	getMarketSaving,
	getPerStepPrice,
	getStepQuantity,
	normalizeCartQuantity,
	type ProductPresentation,
	toNumber,
	toQuantityString,
} from "~/shared/common/commerce.helpers";
import type { HomeOffer } from "~/shared/common/home.types";

export type OfferPricing = Pick<
	HomeOffer,
	| "currency"
	| "discountPercent"
	| "marketPrice"
	| "moq"
	| "moqPrice"
	| "step"
	| "unit"
	| "unitPrice"
> &
	ProductPresentation;

// Customers never see a market-price comparison while this is off; the market
// price still feeds the offers ranking and the admin.
export const SHOW_MARKET_SAVING = false;

const percentFormatter = new Intl.NumberFormat("es-AR", {
	maximumFractionDigits: 2,
});

function getEffectiveDiscountPercent(offer: OfferPricing) {
	const percent = toNumber(offer.discountPercent);
	if (percent === null || percent <= 0) return null;
	return Math.min(percent, 100);
}

export function getOfferQuantityLabel(
	quantity: string,
	unit: CatalogProductUnit,
	presentation?: ProductPresentation | null,
) {
	return formatQuantity(quantity, unit, presentation);
}

function perUnitLabel(offer: OfferPricing) {
	return formatUnitLabel(1, offer.unit, offer);
}

/**
 * What one step buys: "por 500 g" below a kilo, "por kg", "por 1,5 kg",
 * "por frasco 370 g", "por 6 frascos 370 g".
 */
export function getOfferStepLabel(offer: OfferPricing) {
	const step = getStepQuantity(offer);
	if (offer.unit === "kg" && step > 0 && step < 1) {
		return `por ${formatQuantityInput(toQuantityString(step * 1000))} g`;
	}
	if (step === 1) return `por ${formatUnitLabel(1, offer.unit, offer)}`;
	return `por ${formatQuantity(step, offer.unit, offer)}`;
}

export function getOfferHeadlinePrice(offer: OfferPricing) {
	return {
		amount: formatCurrency(getPerStepPrice(offer) ?? 0, offer.currency),
		unitLabel: getOfferStepLabel(offer),
	};
}

const spokenMeasureLabels = { kg: "por kg", L: "por litro" } as const;

export function getOfferComparisonPrice(offer: OfferPricing) {
	const comparison = getComparisonPrice(offer, offer.unit, offer);
	if (comparison === null) return null;
	return {
		amount: formatCurrency(comparison.amount, offer.currency),
		measureLabel: `/ ${comparison.measure}`,
		spokenLabel: spokenMeasureLabels[comparison.measure],
	};
}

export function getOfferTotalAmount(
	terms: CatalogClientTerms,
	quantity: string,
) {
	return formatCurrency(calculateLineTotal(terms, quantity), terms.currency);
}

export function getOfferTotalLabel(
	terms: CatalogClientTerms,
	quantity: string,
) {
	return `Total ${getOfferTotalAmount(terms, quantity)}`;
}

export function getOfferFixedQuantityLabel(
	terms: CatalogClientTerms,
	unit: CatalogProductUnit,
	presentation?: ProductPresentation | null,
) {
	return getOfferQuantityLabel(
		normalizeCartQuantity(terms.moq, terms),
		unit,
		presentation,
	);
}

export function getOfferInCartLabel(
	quantity: string,
	unit: CatalogProductUnit,
	presentation?: ProductPresentation | null,
) {
	return `Ya tenés ${getOfferQuantityLabel(quantity, unit, presentation)} en tu pedido`;
}

// Strike through Coco's undiscounted step price, never the market price.
export function getOfferStrikethroughPrice(offer: OfferPricing) {
	if (getEffectiveDiscountPercent(offer) === null) return null;
	return formatCurrency(getBaseStepPrice(offer) ?? 0, offer.currency);
}

export function getOfferDiscountLabel(offer: OfferPricing) {
	const percent = getEffectiveDiscountPercent(offer);
	if (percent === null) return null;
	return `-${percentFormatter.format(percent)}%`;
}

export function getMarketSavingLabel(offer: OfferPricing) {
	const saving = getMarketSaving(offer);
	if (saving === null) return null;
	return `Ahorrás ${formatCurrency(saving.perUnit, offer.currency)} por ${perUnitLabel(offer)} vs. góndola`;
}
