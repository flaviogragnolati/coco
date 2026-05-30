import type {
	ProductDetail,
	ProductFormValues,
} from "~/shared/common/admin-crud/product.types";

export const defaultProductFormValues: ProductFormValues = {
	name: "",
	description: "",
	cartImageUrl: "",
	cardImageUrl: "",
	images: [],
	unit: "piece",
	brandAssignment: { mode: "none" },
	defaultSupplierId: undefined,
	active: true,
};

export function productDetailToFormValues(
	product: ProductDetail,
): ProductFormValues {
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
		defaultSupplierId: product.defaultSupplier?.id,
		active: product.active,
	};
}
