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

function getMinimumQuantity(offer: OfferPricing) {
	const quantity = formatQuantity(offer.moq, offer.unit);
	if (toNumber(offer.moq) === 1) return quantity;
	if (offer.unit === "box") return quantity.replace(/caja$/, "cajas");
	if (offer.unit === "piece" || offer.unit === "other")
		return quantity.replace(/unidad$/, "unidades");
	return quantity;
}

export function getOfferMinimumLabel(offer: OfferPricing) {
	return `Mínimo: ${getMinimumQuantity(offer)}`;
}

export function getOfferHeadlinePrice(offer: OfferPricing) {
	const perUnitPrice = getPerUnitPrice(offer);
	const hasUnitPrice =
		toNumber(offer.unitPrice) !== null && perUnitPrice !== null;
	return {
		amount: hasUnitPrice
			? formatCurrency(perUnitPrice ?? 0, offer.currency)
			: getOfferBlockPrice(offer),
		unitLabel: `por ${hasUnitPrice ? productUnitLabelMap[offer.unit] : getMinimumQuantity(offer)}`,
	};
}

export function getOfferMinimumTotal(offer: OfferPricing) {
	return `Total del mínimo: ${getOfferBlockPrice(offer)}`;
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
