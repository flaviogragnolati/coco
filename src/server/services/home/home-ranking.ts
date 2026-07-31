import type { HomeOffersCriterion } from "~/prisma/client";
import { getMarketSaving, toNumber } from "~/shared/common/commerce.helpers";
import type { HomeOffer } from "~/shared/common/home.types";

/**
 * The curation inputs the ranking reads but the rendered card does not:
 * `homeOfferRank` is the admin pin and `fromDate` only breaks ties. Both are
 * dropped by `homeOfferSchema` on the way out of the service, so they never
 * widen the contract the home components consume.
 */
export type RankableHomeOffer = HomeOffer & {
	homeOfferRank: number | null;
	fromDate: Date;
};

export type HomeOfferCuration = {
	spotlightProductId: number | null;
	criterion: HomeOffersCriterion;
	offersLimit: number;
};

type PinnedHomeOffer = RankableHomeOffer & { homeOfferRank: number };

function isPinned(offer: RankableHomeOffer): offer is PinnedHomeOffer {
	return offer.homeOfferRank !== null;
}

/**
 * `marketSaving` is measured on the whole MOQ block, not per unit: a kilo and a
 * box are not comparable per unit, while "what you save on this purchase" is.
 */
function getCriterionValue(
	offer: RankableHomeOffer,
	criterion: HomeOffersCriterion,
) {
	if (criterion === "discountPercent") return toNumber(offer.discountPercent);
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
	const pinned = offers
		.filter(isPinned)
		.sort(
			(left, right) =>
				left.homeOfferRank - right.homeOfferRank || compareRecency(left, right),
		);
	const ranked = offers
		.filter((offer) => !isPinned(offer))
		.sort(compareByCriterion(criterion));

	return [...pinned, ...ranked];
}

export function dedupeHomeOffersByProduct(offers: RankableHomeOffer[]) {
	const seen = new Set<number>();
	return offers.filter((offer) => {
		if (seen.has(offer.productId)) return false;
		seen.add(offer.productId);
		return true;
	});
}

export function composeHomeContent(
	offers: RankableHomeOffer[],
	curation: HomeOfferCuration,
): { spotlight: RankableHomeOffer | null; offers: RankableHomeOffer[] } {
	// Dedupe before ranking: a product with two current terms rows would
	// otherwise compete with itself and could take two slots in the grid.
	const ranked = rankHomeOffers(
		dedupeHomeOffersByProduct(offers),
		curation.criterion,
	);
	// A spotlight whose terms are no longer vigente is simply absent from
	// `ranked`; the pin is skipped silently and the top of the ranking fills the
	// hero rather than leaving it empty.
	const spotlight =
		ranked.find((offer) => offer.productId === curation.spotlightProductId) ??
		ranked[0] ??
		null;

	return {
		spotlight,
		offers: ranked
			.filter((offer) => offer !== spotlight)
			.slice(0, Math.max(curation.offersLimit, 0)),
	};
}
