import {
	CATALOG_CATEGORY_NAMES,
	type CatalogCategoryName,
} from "./lib/catalog-categories";
import { quintalCategoryOverrides } from "./quintal-catalog.overrides";
import type {
	QuintalCategoryOverrides,
	QuintalProduct,
} from "./quintal-catalog.schema";

/** Explicit key exceptions win over canonical category names and legacy headings. */
export function resolveQuintalCategory(
	product: Pick<QuintalProduct, "key" | "category">,
	overrides: QuintalCategoryOverrides = quintalCategoryOverrides,
): CatalogCategoryName | null {
	return (
		overrides.categoryExceptions[product.key] ??
		((CATALOG_CATEGORY_NAMES as readonly string[]).includes(product.category)
			? (product.category as CatalogCategoryName)
			: null) ??
		overrides.categoryMap[product.category] ??
		null
	);
}
