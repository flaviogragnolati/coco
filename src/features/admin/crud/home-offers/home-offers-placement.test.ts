import { describe, expect, test } from "vitest";

import type { HomeFeaturedListItem } from "~/shared/common/admin-crud/home-offers.types";
import { statusPresets } from "~/shared/common/admin-crud/status-presets";
import { featuredStatusChipConfig } from "./home-offers.mappers";
import { findOverflowingFeatured } from "./home-offers-placement";

type Status = HomeFeaturedListItem["status"];

function item(
	id: number,
	status: Status = "shown",
	sharedWithName: string | null = null,
): HomeFeaturedListItem {
	return {
		id,
		position: id,
		target: { kind: "product", productId: id },
		name: `Producto ${id}`,
		status,
		sharedWithName,
	};
}

function shownItems(count: number) {
	return Array.from({ length: count }, (_, index) => item(index + 1));
}

describe("findOverflowingFeatured", () => {
	test("an empty list overflows nothing", () => {
		expect(findOverflowingFeatured([], 4)).toEqual(new Set());
	});

	test("fewer shown entries than places all fit", () => {
		expect(findOverflowingFeatured(shownItems(3), 4)).toEqual(new Set());
	});

	test("exactly as many shown entries as places all fit", () => {
		expect(findOverflowingFeatured(shownItems(4), 4)).toEqual(new Set());
	});

	test("six shown entries in four places leave out the fifth and sixth", () => {
		expect(findOverflowingFeatured(shownItems(6), 4)).toEqual(new Set([5, 6]));
	});

	test("entries that are not shown take no place", () => {
		const items = [
			item(1),
			item(2, "noPrice"),
			item(3, "sharedCard", "Combo A"),
			item(4, "inBand"),
			item(5, "inactive"),
			item(6),
			item(7),
		];

		expect(findOverflowingFeatured(items, 2)).toEqual(new Set([7]));
	});

	test("one place keeps only the first shown entry", () => {
		const items = [item(1, "noPrice"), item(2), item(3), item(4)];

		expect(findOverflowingFeatured(items, 1)).toEqual(new Set([3, 4]));
	});
});

describe("featuredStatusChipConfig", () => {
	test.each<[Status, string, string]>([
		["shown", "En la sección", statusPresets.success.variant],
		["inBand", "En la banda", statusPresets.inProgress.variant],
		["noPrice", "Sin precio vigente", statusPresets.failed.variant],
		["inactive", "Inactivo", statusPresets.attention.variant],
		["sharedCard", "En la tarjeta de Combo A", statusPresets.inert.variant],
	])("%s reads %s", (status, label, variant) => {
		const config = featuredStatusChipConfig(
			item(1, status, "Combo A"),
			false,
			4,
		);

		expect(config?.label).toBe(label);
		expect(config?.variant).toBe(variant);
	});

	test("overflow takes priority over shown and names the places", () => {
		const config = featuredStatusChipConfig(item(1), true, 4);

		expect(config?.label).toBe("No entra");
		expect(config?.variant).toBe(statusPresets.attention.variant);
		expect(config?.hint).toContain("4 lugares");
	});
});
