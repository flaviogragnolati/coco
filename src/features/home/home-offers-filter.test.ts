import { expect, test } from "vitest";
import type { CatalogProductUnit } from "~/shared/common/catalog.types";
import { getOfferUnitFilters, selectVisibleOffers } from "./home-offers-filter";

function offers(...units: CatalogProductUnit[]) {
	return units.map((unit, index) => ({ id: index + 1, unit }));
}

test("offers one chip per unit present, in a fixed order", () => {
	expect(getOfferUnitFilters(offers("piece", "box", "kg", "box"))).toEqual([
		"kg",
		"caja",
		"unidad",
	]);
});

test("units that share a Spanish label share a chip", () => {
	expect(getOfferUnitFilters(offers("piece", "other"))).toEqual(["unidad"]);
});

test("no offers means no chips", () => {
	expect(getOfferUnitFilters([])).toEqual([]);
});

test("'Todos' shows the pool in ranking order, cut to the grid size", () => {
	const visible = selectVisibleOffers(
		offers("kg", "box", "kg", "box"),
		null,
		3,
	);

	expect(visible.map((offer) => offer.id)).toEqual([1, 2, 3]);
});

test("a unit chip refills the grid from deeper in the pool", () => {
	const visible = selectVisibleOffers(
		offers("kg", "kg", "kg", "box", "kg", "box", "box"),
		"caja",
		2,
	);

	expect(visible.map((offer) => offer.id)).toEqual([4, 6]);
});

test("the 'unidad' chip matches every unit labelled that way", () => {
	const visible = selectVisibleOffers(
		offers("piece", "kg", "other"),
		"unidad",
		4,
	);

	expect(visible.map((offer) => offer.id)).toEqual([1, 3]);
});
