import type {
	CategoryDetail,
	CategoryFormValues,
	CategoryListItem,
} from "~/shared/common/admin-crud/category.types";

export const defaultCategoryFormValues: CategoryFormValues = {
	name: "",
	sortOrder: 1,
	active: true,
};

/** A new category goes last unless the admin picks another position. */
export function nextCategorySortOrder(categories: CategoryListItem[]) {
	return (
		categories.reduce(
			(highest, category) => Math.max(highest, category.sortOrder),
			0,
		) + 1
	);
}

export function categoryDetailToFormValues(
	category: CategoryDetail,
): CategoryFormValues {
	return {
		name: category.name,
		sortOrder: category.sortOrder,
		active: category.active,
	};
}
