import { describe, expect, it } from "vitest";

import { toCatalogCategory } from "./catalog-category.mapper";

const frutosSecos = {
	id: 1,
	name: "Frutos secos",
	sortOrder: 1,
	photoBackgroundColor: "#e8dcc8",
	active: true,
	deleted: false,
};

describe("toCatalogCategory", () => {
	it("exposes an active category and its photo color without its flags", () => {
		expect(toCatalogCategory(frutosSecos)).toEqual({
			id: 1,
			name: "Frutos secos",
			sortOrder: 1,
			photoBackgroundColor: "#e8dcc8",
		});
	});

	it.each([
		["inactive", { ...frutosSecos, active: false }],
		["deleted", { ...frutosSecos, active: false, deleted: true }],
	])("hides a %s category", (_label, category) => {
		expect(toCatalogCategory(category)).toBeNull();
	});

	it("keeps an uncategorized product uncategorized", () => {
		expect(toCatalogCategory(null)).toBeNull();
	});
});
