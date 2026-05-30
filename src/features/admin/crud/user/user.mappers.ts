import type {
	UserDetail,
	UserFormValues,
} from "~/shared/common/admin-crud/user.types";

export const emptyUserAddressFormValue: UserFormValues["addresses"][number] = {
	type: "all",
	line1: "",
	line2: "",
	city: "",
	state: "",
	postalCode: "",
	country: "Argentina",
	active: true,
};

export const defaultUserFormValues: UserFormValues = {
	name: "",
	email: "",
	emailVerified: false,
	image: "",
	role: "user",
	active: true,
	addresses: [],
};

export function userDetailToFormValues(user: UserDetail): UserFormValues {
	return {
		name: user.name,
		email: user.email,
		emailVerified: user.emailVerified,
		image: user.image ?? "",
		role: user.role,
		active: user.active,
		addresses: user.addresses.map((address) => ({
			id: address.id,
			type: address.type,
			line1: address.line1,
			line2: address.line2 ?? "",
			city: address.city,
			state: address.state,
			postalCode: address.postalCode,
			country: address.country,
			active: address.active,
		})),
	};
}
