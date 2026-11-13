import { describe, expect, it } from "vitest";

import { visibleProductDescription } from "./product-description";

const name = "Aceite de oliva extra virgen 0,5 L";

describe("visibleProductDescription", () => {
	it.each([
		["missing", null],
		["undefined", undefined],
		["empty", ""],
		["blank", "   "],
		["the name", name],
		["the name with a final period", `${name}.`],
		[
			"the name with other casing and spacing",
			"  aceite de oliva  EXTRA virgen 0,5 l. ",
		],
	])("hides a description that is %s", (_label, description) => {
		expect(visibleProductDescription(description, name)).toBeNull();
	});

	it("keeps a specific description, trimmed", () => {
		expect(
			visibleProductDescription(
				"  Primera prensada en frío, acidez menor a 0,5 %.  ",
				name,
			),
		).toBe("Primera prensada en frío, acidez menor a 0,5 %.");
	});

	it("keeps a description that only starts with the name", () => {
		const description = `${name}. Primera prensada en frío.`;
		expect(visibleProductDescription(description, name)).toBe(description);
	});
});
