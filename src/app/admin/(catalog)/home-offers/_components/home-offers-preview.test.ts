import { describe, expect, it } from "vitest";

import { resolvePreviewSpotlightId } from "./home-offers-preview";

const gridOrder = [{ productId: 3 }, { productId: 1 }, { productId: 2 }];

describe("resolvePreviewSpotlightId", () => {
	it("keeps the admin's pick when it can be shown", () => {
		expect(resolvePreviewSpotlightId(2, gridOrder)).toBe(2);
	});

	it("takes the top of the grid order when nobody picked one", () => {
		expect(resolvePreviewSpotlightId(null, gridOrder)).toBe(3);
	});

	it("takes the top of the grid order when the pick cannot be shown", () => {
		expect(resolvePreviewSpotlightId(9, gridOrder)).toBe(3);
	});

	it("returns null when there is nothing to show", () => {
		expect(resolvePreviewSpotlightId(null, [])).toBeNull();
	});
});
