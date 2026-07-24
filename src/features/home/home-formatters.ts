import {
	formatCurrency,
	formatQuantity,
	getPerUnitPrice,
	productUnitLabelMap,
} from "~/shared/common/commerce.helpers";
import type { HomeOffer } from "~/shared/common/home.types";

export function getOfferBlockPrice(offer: HomeOffer) {
	return formatCurrency(offer.moqPrice, offer.currency);
}

export function getOfferMinimumLabel(offer: HomeOffer) {
	return `Cantidad mínima: ${formatQuantity(offer.moq, offer.unit)}`;
}

export function getOfferUnitReference(offer: HomeOffer) {
	const perUnitPrice = getPerUnitPrice(offer);
	if (perUnitPrice === null) return null;

	return `≈ ${formatCurrency(perUnitPrice, offer.currency)} / ${productUnitLabelMap[offer.unit]}`;
}
