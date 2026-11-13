import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { cssUrl, ProductImage } from "./product-image";

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

describe("ProductImage legend", () => {
	const photo = "https://cdn.example.com/almendra.webp";

	it("writes the legend over a photo in the backdrop's dark tone, hidden from screen readers", () => {
		const html = renderToStaticMarkup(
			<ProductImage
				imageUrl={photo}
				legend={{ backdropColor: "#e2c8ab" }}
				name="Almendra Non Pareil"
			/>,
		);

		expect(html).toContain('aria-label="Almendra Non Pareil"');
		expect(html).toMatch(
			/<span aria-hidden="true"[^>]*style="color:#724f27">Imagen ilustrativa<\/span>/,
		);
	});

	it("leaves a photo without the legend prop untouched", () => {
		const html = renderToStaticMarkup(
			<ProductImage imageUrl={photo} name="Almendra Non Pareil" />,
		);

		expect(html).not.toContain("Imagen ilustrativa");
	});

	it("never writes the legend on the no-photo placeholder", () => {
		const html = renderToStaticMarkup(
			<ProductImage
				imageUrl={null}
				legend={{ backdropColor: "#e2c8ab" }}
				name="Miel pura"
			/>,
		);

		expect(html).not.toContain("Imagen ilustrativa");
		expect(html).toContain("Sin imagen para Miel pura");
	});

	it("draws the legend in neutral gray without a backdrop color", () => {
		const html = renderToStaticMarkup(
			<ProductImage
				imageUrl={photo}
				legend={{ backdropColor: null }}
				name="Almendra Non Pareil"
			/>,
		);

		expect(html).toContain('style="color:#4d4d4d">Imagen ilustrativa');
	});
});
