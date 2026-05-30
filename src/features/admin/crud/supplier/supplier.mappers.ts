import type {
	SupplierDetail,
	SupplierFormValues,
} from "~/shared/common/admin-crud/supplier.types";

export const defaultSupplierFormValues: SupplierFormValues = {
	name: "",
	description: "",
	active: true,
	address: {
		line1: "",
		line2: "",
		city: "",
		state: "",
		postalCode: "",
		country: "Argentina",
	},
	contactInfo: {
		contactName: "",
		email: "",
		phone: "",
		whatsapp: "",
	},
};

export function supplierDetailToFormValues(
	supplier: SupplierDetail,
): SupplierFormValues {
	return {
		name: supplier.name,
		description: supplier.description ?? "",
		active: supplier.active,
		address: {
			line1: supplier.address.line1,
			line2: supplier.address.line2 ?? "",
			city: supplier.address.city,
			state: supplier.address.state,
			postalCode: supplier.address.postalCode,
			country: supplier.address.country,
		},
		contactInfo: {
			contactName: supplier.contactInfo.contactName,
			email: supplier.contactInfo.email ?? "",
			phone: supplier.contactInfo.phone ?? "",
			whatsapp: supplier.contactInfo.whatsapp ?? "",
		},
	};
}
