import { describe, expect, it } from "vitest";

import {
	illustrativeLegendColor,
	NEUTRAL_LEGEND_COLOR,
} from "./product-image-legend";

describe("illustrativeLegendColor", () => {
	it.each([
		["#e8dcc8", "#6c542d"],
		["#e2c8ab", "#724f27"],
		["#FFD400", "#997f00"],
		["#c8e6c9", "#306932"],
	])("darkens %s to %s, keeping its hue and saturation", (backdrop, legend) => {
		expect(illustrativeLegendColor(backdrop)).toBe(legend);
	});

	it.each([
		"#cccccc",
		"#ffffff",
	])("draws the gray backdrop %s in the neutral gray", (backdrop) => {
		expect(illustrativeLegendColor(backdrop)).toBe(NEUTRAL_LEGEND_COLOR);
	});

	it.each([
		null,
		"beige",
		"#abc",
	])("falls back to the neutral gray for %s", (backdrop) => {
		expect(illustrativeLegendColor(backdrop)).toBe("#4d4d4d");
	});
});
