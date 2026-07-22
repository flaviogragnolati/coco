import {
	formatCurrency,
	formatQuantity,
	productUnitLabelMap,
} from "~/shared/common/commerce.helpers";
import type { HomeOffer } from "~/shared/common/home.types";

// HomeOffer has no step/stepPrice/max, so it is not a CatalogClientTerms and
// cannot use getDisplayPrice/getPriceLabel directly. These two adapters are the
// only home-specific part left; everything below them is shared.
export function getOfferDisplayPrice(offer: HomeOffer) {
	return formatCurrency(offer.refPrice ?? offer.moqPrice, offer.currency);
}

export function getOfferPriceLabel(offer: HomeOffer) {
	if (offer.refPrice)
		return `Precio ref. por ${productUnitLabelMap[offer.unit]}`;
	return `Precio MOQ por ${formatQuantity(offer.moq, offer.unit)}`;
}
