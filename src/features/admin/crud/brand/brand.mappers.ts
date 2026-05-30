import type {
	BrandDetail,
	BrandFormValues,
} from "~/shared/common/admin-crud/brand.types";

export const defaultBrandFormValues: BrandFormValues = {
	name: "",
	description: "",
	logoUrl: "",
	active: true,
};

export function brandDetailToFormValues(brand: BrandDetail): BrandFormValues {
	return {
		name: brand.name,
		description: brand.description ?? "",
		logoUrl: brand.logoUrl ?? "",
		active: brand.active,
	};
}
