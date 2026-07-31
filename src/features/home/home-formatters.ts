import {
	formatCurrency,
	formatQuantity,
	getMarketSaving,
	getOfferMoqPrice,
	getPerUnitPrice,
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

export function getOfferMinimumLabel(offer: OfferPricing) {
	return `Cantidad mínima: ${formatQuantity(offer.moq, offer.unit)}`;
}

export function getOfferUnitReference(offer: OfferPricing) {
	const perUnitPrice = getPerUnitPrice(offer);
	if (perUnitPrice === null) return null;

	return `≈ ${formatCurrency(perUnitPrice, offer.currency)} / ${productUnitLabelMap[offer.unit]}`;
}

/**
 * The undiscounted price Coco itself asked for, and only ever that. The market
 * price is never rendered as the struck-through "antes": it is an unverified
 * admin claim about another shop, not a price this store ever charged
 * (ADR 0008).
 */
export function getOfferStrikethroughPrice(offer: OfferPricing) {
	if (getEffectiveDiscountPercent(offer) === null) return null;
	return formatCurrency(offer.moqPrice, offer.currency);
}

export function getOfferDiscountLabel(offer: OfferPricing) {
	const percent = getEffectiveDiscountPercent(offer);
	if (percent === null) return null;
	return `-${percentFormatter.format(percent)}%`;
}

export function getMarketComparison(offer: OfferPricing) {
	const marketPrice = toNumber(offer.marketPrice);
	const saving = getMarketSaving(offer);
	if (marketPrice === null || saving === null) return null;

	const reference = `En otros comercios ≈ ${formatCurrency(marketPrice, offer.currency)} / ${productUnitLabelMap[offer.unit]}`;
	if (saving.perBlock <= 0) return reference;

	return `${reference} · ahorrás ${formatCurrency(saving.perBlock, offer.currency)}`;
}
