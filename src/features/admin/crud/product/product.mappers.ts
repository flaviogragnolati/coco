import type {
	ProductDetail,
	ProductFormValues,
} from "~/shared/common/admin-crud/product.types";

/** No category preselected: the admin must pick one. */
export const defaultProductFormValues: Omit<ProductFormValues, "categoryId"> & {
	categoryId?: number;
} = {
	name: "",
	description: "",
	cartImageUrl: "",
	cardImageUrl: "",
	images: [],
	unit: "piece",
	brandAssignment: { mode: "none" },
	categoryId: undefined,
	defaultSupplierId: undefined,
	active: true,
};

export function productDetailToFormValues(
	product: ProductDetail,
): typeof defaultProductFormValues {
	return {
		name: product.name,
		description: product.description ?? "",
		cartImageUrl: product.cartImageUrl ?? "",
		cardImageUrl: product.cardImageUrl ?? "",
		images: product.images,
		unit: product.unit,
		brandAssignment: product.brand
			? {
					mode: "existing",
					brandId: product.brand.id,
				}
			: { mode: "none" },
		categoryId: product.category?.id,
		defaultSupplierId: product.defaultSupplier?.id,
		active: product.active,
	};
}
