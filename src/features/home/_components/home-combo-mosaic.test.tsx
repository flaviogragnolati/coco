import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import { HomeComboMosaic } from "./home-combo-mosaic";

test("the combo mosaic tints each photo's legend with its own category color", () => {
	const html = renderToStaticMarkup(
		<HomeComboMosaic
			comboName="Combo de frutos secos"
			images={[
				{
					url: "https://example.com/almendras.jpg",
					name: "Almendras",
					photoBackgroundColor: "#e2c8ab",
				},
				{
					url: "https://example.com/nueces.jpg",
					name: "Nueces",
					photoBackgroundColor: null,
				},
			]}
		/>,
	);

	expect(html.match(/Imagen ilustrativa/g)).toHaveLength(2);
	expect(html).toContain('style="color:#724f27"');
	expect(html).toContain('style="color:#4d4d4d"');
});
