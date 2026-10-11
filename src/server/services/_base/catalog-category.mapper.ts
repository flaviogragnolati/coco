import type { CatalogCategorySummary } from "~/shared/common/catalog.types";

export type CatalogCategorySource = {
	id: number;
	name: string;
	sortOrder: number;
	active: boolean;
	deleted: boolean;
};

/** An inactive or deleted category is hidden from customers, not its products. */
export function toCatalogCategory(
	category: CatalogCategorySource | null,
): CatalogCategorySummary | null {
	if (!category?.active || category.deleted) return null;

	return {
		id: category.id,
		name: category.name,
		sortOrder: category.sortOrder,
	};
}
