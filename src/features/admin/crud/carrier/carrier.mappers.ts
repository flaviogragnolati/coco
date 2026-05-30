import type {
	CarrierDetail,
	CarrierFormValues,
} from "~/shared/common/admin-crud/carrier.types";

export const defaultCarrierFormValues: CarrierFormValues = {
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

export function carrierDetailToFormValues(
	carrier: CarrierDetail,
): CarrierFormValues {
	return {
		name: carrier.name,
		description: carrier.description ?? "",
		active: carrier.active,
		address: {
			line1: carrier.address.line1,
			line2: carrier.address.line2 ?? "",
			city: carrier.address.city,
			state: carrier.address.state,
			postalCode: carrier.address.postalCode,
			country: carrier.address.country,
		},
		contactInfo: {
			contactName: carrier.contactInfo.contactName,
			email: carrier.contactInfo.email ?? "",
			phone: carrier.contactInfo.phone ?? "",
			whatsapp: carrier.contactInfo.whatsapp ?? "",
		},
	};
}
