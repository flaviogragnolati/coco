import type { HomeFeaturedListItem } from "~/shared/common/admin-crud/home-offers.types";

/**
 * Ids of the list entries the section has no place for. Only `shown` entries
 * take a place, in list order: the server already excludes what the band holds
 * and what shares a card, so recomputing the band here would double count.
 */
export function findOverflowingFeatured(
	items: HomeFeaturedListItem[],
	places: number,
): Set<number> {
	const overflowing = new Set<number>();
	let placed = 0;

	for (const item of items) {
		if (item.status !== "shown") continue;
		if (placed < places) {
			placed += 1;
		} else {
			overflowing.add(item.id);
		}
	}

	return overflowing;
}
