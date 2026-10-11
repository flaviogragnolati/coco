import type { CatalogCategoryName } from "./lib/catalog-categories";
import { quintalCategoryOverrides } from "./quintal-catalog.overrides";
import type {
	QuintalCategoryOverrides,
	QuintalProduct,
} from "./quintal-catalog.schema";

/** The product's own exception wins over its heading; null when neither maps it. */
export function resolveQuintalCategory(
	product: Pick<QuintalProduct, "key" | "category">,
	overrides: QuintalCategoryOverrides = quintalCategoryOverrides,
): CatalogCategoryName | null {
	return (
		overrides.categoryExceptions[product.key] ??
		overrides.categoryMap[product.category] ??
		null
	);
}
