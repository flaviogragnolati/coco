import type {
	AddressDetail,
	AddressFormValues,
} from "~/shared/common/admin-crud/address.types";

export const defaultAddressFormValues: AddressFormValues = {
	userId: "",
	type: "all",
	line1: "",
	line2: "",
	city: "",
	state: "",
	postalCode: "",
	country: "Argentina",
	active: true,
};

export function addressDetailToFormValues(
	address: AddressDetail,
): AddressFormValues {
	return {
		userId: address.user.id,
		type: address.type,
		line1: address.line1,
		line2: address.line2 ?? "",
		city: address.city,
		state: address.state,
		postalCode: address.postalCode,
		country: address.country,
		active: address.active,
	};
}
