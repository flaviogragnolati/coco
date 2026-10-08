import { describe, expect, it } from "vitest";

import { cssUrl } from "./product-image";

describe("cssUrl", () => {
	it("quotes URLs so spaces and parentheses stay inside the url()", () => {
		expect(cssUrl("https://cdn.example.com/nuez (1) pelada.jpg")).toBe(
			'url("https://cdn.example.com/nuez (1) pelada.jpg")',
		);
	});

	it("escapes quotes, backslashes and line breaks that would end the string", () => {
		expect(cssUrl('https://x.test/a"b\\c\nd\re\ff')).toBe(
			'url("https://x.test/a\\22 b\\5c c\\a d\\d e\\c f")',
		);
	});
});
