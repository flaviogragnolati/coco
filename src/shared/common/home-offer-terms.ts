import type { CatalogClientTerms } from "./catalog.types";
import type { HomeOffer } from "./home.types";

/** The client terms a home offer carries, in the shape the commerce helpers take. */
export function homeOfferTerms(offer: HomeOffer): CatalogClientTerms {
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
