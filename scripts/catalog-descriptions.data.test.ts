import { describe, expect, it } from "vitest";

import { PRODUCT_DESCRIPTION_MAX_LENGTH } from "~/schemas/admin/product.schemas";
import { visibleProductDescription } from "~/shared/common/product-description";
import { catalogDescriptions } from "./catalog-descriptions.data";
import { findDuplicateEntries } from "./catalog-descriptions.plan";
import { quintalCatalog } from "./quintal-catalog.data";

describe("catalog descriptions", () => {
	it("covers the 27 launch products, ids 100 to 126, once each", () => {
		expect(catalogDescriptions.map((entry) => entry.productId)).toEqual(
			Array.from({ length: 27 }, (_, index) => 100 + index),
		);
		expect(findDuplicateEntries(catalogDescriptions)).toEqual([]);
	});

	it.each(
		catalogDescriptions,
	)("#$productId fits the admin limit and is shown to customers", ({
		name,
		description,
	}) => {
		expect(description.length).toBeLessThanOrEqual(
			PRODUCT_DESCRIPTION_MAX_LENGTH,
		);
		expect(visibleProductDescription(description, name)).toBe(description);
	});

	it("is what the initial catalog seeds, so a catalog reset keeps it", () => {
		expect(
			quintalCatalog.products.map(({ name, description }) => ({
				name,
				description,
			})),
		).toEqual(
			catalogDescriptions.map(({ name, description }) => ({
				name,
				description,
			})),
		);
	});
});
