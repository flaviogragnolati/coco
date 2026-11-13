import type { HomeOffersCriterion } from "~/prisma/client";
import { getMarketSaving, toNumber } from "~/shared/common/commerce.helpers";
import type { HomeOffer } from "~/shared/common/home.types";

// The order count is used only for ranking and stripped from the public offer.
export type RankableHomeOffer = HomeOffer & {
	paidOrderCount: number;
};

/**
 * `marketSaving` is measured on the whole MOQ block, not per unit: a kilo and a
 * box are not comparable per unit, while "what you save on this purchase" is.
 */
function getCriterionValue(
	offer: RankableHomeOffer,
	criterion: HomeOffersCriterion,
) {
	if (criterion === "discountPercent") return toNumber(offer.discountPercent);
	if (criterion === "orderVolume") return offer.paidOrderCount;
	return getMarketSaving(offer)?.perBlock ?? null;
}

/** The minimum an offer must expose to be ordered deterministically. */
export type RankingTieBreak = {
	fromDate: Date;
	productClientTermsId: number;
};

function compareRecency(left: RankingTieBreak, right: RankingTieBreak) {
	return (
		right.fromDate.getTime() - left.fromDate.getTime() ||
		right.productClientTermsId - left.productClientTermsId
	);
}

/**
 * Shared so the admin's "what the ranking would fill in" preview orders offers
 * exactly as the home does, ties included — two products on the same discount
 * are common, and a preview that broke that tie differently would be quietly
 * wrong about the grid it claims to predict.
 */
export function compareRankedOffers<Offer extends RankingTieBreak>(
	getValue: (offer: Offer) => number | null,
) {
	return (left: Offer, right: Offer) => {
		const leftValue = getValue(left);
		const rightValue = getValue(right);

		if (leftValue === null || rightValue === null) {
			if (leftValue !== rightValue) return leftValue === null ? 1 : -1;
		} else if (leftValue !== rightValue) {
			return rightValue - leftValue;
		}

		return compareRecency(left, right);
	};
}

function compareByCriterion(criterion: HomeOffersCriterion) {
	return compareRankedOffers<RankableHomeOffer>((offer) =>
		getCriterionValue(offer, criterion),
	);
}

export function rankHomeOffers(
	offers: RankableHomeOffer[],
	criterion: HomeOffersCriterion,
): RankableHomeOffer[] {
	return [...offers].sort(compareByCriterion(criterion));
}

export function dedupeHomeOffersByProduct(offers: RankableHomeOffer[]) {
	const seen = new Set<number>();
	return offers.filter((offer) => {
		if (seen.has(offer.productId)) return false;
		seen.add(offer.productId);
		return true;
	});
}
