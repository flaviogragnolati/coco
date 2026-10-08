import type { CatalogProductUnit } from "~/shared/common/catalog.types";
import { productUnitLabelMap } from "~/shared/common/commerce.helpers";

type UnitOffer = { unit: CatalogProductUnit };

const unitOrder: CatalogProductUnit[] = [
	"kg",
	"gr",
	"lb",
	"box",
	"piece",
	"other",
];

/**
 * The unit chips the grid can offer, as Spanish labels: units that read the
 * same ("unidad") share one chip, since a customer cannot tell them apart.
 */
export function getOfferUnitFilters(offers: UnitOffer[]): string[] {
	const present = new Set(
		offers.map((offer) => productUnitLabelMap[offer.unit]),
	);
	const labels = new Set(unitOrder.map((unit) => productUnitLabelMap[unit]));

	return [...labels].filter((label) => present.has(label));
}

/** `null` is "Todos": the grid as the ranking composed it. */
export function selectVisibleOffers<Offer extends UnitOffer>(
	offers: Offer[],
	unitLabel: string | null,
	limit: number,
): Offer[] {
	return offers
		.filter(
			(offer) =>
				unitLabel === null || productUnitLabelMap[offer.unit] === unitLabel,
		)
		.slice(0, limit);
}
