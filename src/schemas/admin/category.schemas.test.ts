import { describe, expect, it } from "vitest";

import { categoryCreateInputSchema } from "./category.schemas";

const base = { name: "Frutos secos", sortOrder: 1 };

describe("category photo background color", () => {
	it("stores the color in lowercase", () => {
		expect(
			categoryCreateInputSchema.parse({
				...base,
				photoBackgroundColor: "#E8DCC8",
			}).photoBackgroundColor,
		).toBe("#e8dcc8");
	});

	it("defaults to no color", () => {
		expect(
			categoryCreateInputSchema.parse(base).photoBackgroundColor,
		).toBeNull();
	});

	it.each([
		"#abc",
		"beige",
		"e8dcc8",
	])("refuses %s, which is not #rrggbb", (photoBackgroundColor) => {
		const result = categoryCreateInputSchema.safeParse({
			...base,
			photoBackgroundColor,
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toBe("Elegí un color válido");
	});
});
