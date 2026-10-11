import type {
	CatalogClientTerms,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	calculateLineTotal,
	formatCurrency,
	formatQuantity,
	formatUnitLabel,
	getBaseUnitPrice,
	getMarketSaving,
	getPerUnitPrice,
	normalizeCartQuantity,
	type ProductPresentation,
	toNumber,
} from "~/shared/common/commerce.helpers";
import type { HomeOffer } from "~/shared/common/home.types";

export type OfferPricing = Pick<
	HomeOffer,
	| "currency"
	| "discountPercent"
	| "marketPrice"
	| "moq"
	| "moqPrice"
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

export function getOfferHeadlinePrice(offer: OfferPricing) {
	return {
		amount: formatCurrency(getPerUnitPrice(offer) ?? 0, offer.currency),
		unitLabel: `por ${perUnitLabel(offer)}`,
	};
}

export function getOfferTotalLabel(
	terms: CatalogClientTerms,
	quantity: string,
) {
	return `Total ${formatCurrency(calculateLineTotal(terms, quantity), terms.currency)}`;
}

export function getOfferFixedQuantityLabel(
	terms: CatalogClientTerms,
	unit: CatalogProductUnit,
	presentation?: ProductPresentation | null,
) {
	const quantity = normalizeCartQuantity(terms.moq, terms);
	return `${getOfferQuantityLabel(quantity, unit, presentation)} · ${getOfferTotalLabel(terms, quantity)}`;
}

export function getOfferInCartLabel(
	quantity: string,
	unit: CatalogProductUnit,
	presentation?: ProductPresentation | null,
) {
	return `Ya tenés ${getOfferQuantityLabel(quantity, unit, presentation)} en tu pedido`;
}

// Strike through Coco's undiscounted headline price, never the market price.
export function getOfferStrikethroughPrice(offer: OfferPricing) {
	if (getEffectiveDiscountPercent(offer) === null) return null;
	return formatCurrency(getBaseUnitPrice(offer) ?? 0, offer.currency);
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
