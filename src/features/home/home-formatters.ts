import type {
	CatalogClientTerms,
	CatalogProductUnit,
} from "~/shared/common/catalog.types";
import {
	calculateLineTotal,
	formatCurrency,
	formatQuantity,
	getMarketSaving,
	getOfferMoqPrice,
	getPerUnitPrice,
	normalizeCartQuantity,
	productUnitLabelMap,
	toNumber,
} from "~/shared/common/commerce.helpers";
import type { HomeOffer } from "~/shared/common/home.types";

type OfferPricing = Pick<
	HomeOffer,
	| "currency"
	| "discountPercent"
	| "marketPrice"
	| "moq"
	| "moqPrice"
	| "unit"
	| "unitPrice"
>;

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

export function getOfferBlockPrice(offer: OfferPricing) {
	return formatCurrency(getOfferMoqPrice(offer), offer.currency);
}

export function getOfferQuantityLabel(
	quantity: string,
	unit: CatalogProductUnit,
) {
	const label = formatQuantity(quantity, unit);
	if (toNumber(quantity) === 1) return label;
	if (unit === "box") return label.replace(/caja$/, "cajas");
	if (unit === "piece" || unit === "other")
		return label.replace(/unidad$/, "unidades");
	return label;
}

export function getOfferHeadlinePrice(offer: OfferPricing) {
	const perUnitPrice = getPerUnitPrice(offer);
	const hasUnitPrice =
		toNumber(offer.unitPrice) !== null && perUnitPrice !== null;
	return {
		amount: hasUnitPrice
			? formatCurrency(perUnitPrice ?? 0, offer.currency)
			: getOfferBlockPrice(offer),
		unitLabel: `por ${hasUnitPrice ? productUnitLabelMap[offer.unit] : getOfferQuantityLabel(offer.moq, offer.unit)}`,
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
) {
	const quantity = normalizeCartQuantity(terms.moq, terms);
	return `${getOfferQuantityLabel(quantity, unit)} · ${getOfferTotalLabel(terms, quantity)}`;
}

export function getOfferInCartLabel(
	quantity: string,
	unit: CatalogProductUnit,
) {
	return `Ya tenés ${getOfferQuantityLabel(quantity, unit)} en tu pedido`;
}

// Strike through Coco's undiscounted headline price, never the market price.
export function getOfferStrikethroughPrice(offer: OfferPricing) {
	if (getEffectiveDiscountPercent(offer) === null) return null;
	return formatCurrency(offer.unitPrice ?? offer.moqPrice, offer.currency);
}

export function getOfferDiscountLabel(offer: OfferPricing) {
	const percent = getEffectiveDiscountPercent(offer);
	if (percent === null) return null;
	return `-${percentFormatter.format(percent)}%`;
}

export function getMarketSavingLabel(offer: OfferPricing) {
	const saving = getMarketSaving(offer);
	if (saving === null) return null;
	return `Ahorrás ${formatCurrency(saving.perUnit, offer.currency)} por ${productUnitLabelMap[offer.unit]} vs. góndola`;
}

export function getOfferUnitReference(offer: OfferPricing) {
	const perUnitPrice = getPerUnitPrice(offer);
	if (perUnitPrice === null) return null;

	return `≈ ${formatCurrency(perUnitPrice, offer.currency)} / ${productUnitLabelMap[offer.unit]}`;
}

export function getMarketComparison(offer: OfferPricing) {
	const marketPrice = toNumber(offer.marketPrice);
	const saving = getMarketSaving(offer);
	if (marketPrice === null || saving === null) return null;

	const reference = `En otros comercios ≈ ${formatCurrency(marketPrice, offer.currency)} / ${productUnitLabelMap[offer.unit]}`;
	if (saving.perBlock <= 0) return reference;

	return `${reference} · ahorrás ${formatCurrency(saving.perBlock, offer.currency)}`;
}

export function getOfferBlockStrikethroughPrice(offer: OfferPricing) {
	if (getEffectiveDiscountPercent(offer) === null) return null;
	return formatCurrency(offer.moqPrice, offer.currency);
}
