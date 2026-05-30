import type {
	ProductLocalConstraintsDetail,
	ProductLocalConstraintsFormInput,
} from "~/shared/common/admin-crud/product-local-constraints.types";

function toDateTimeLocalValue(value: Date | string) {
	const date = new Date(value);
	const pad = (part: number) => String(part).padStart(2, "0");

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toJsonTextareaValue(value: unknown) {
	if (value === null || value === undefined) return "";
	return JSON.stringify(value, null, 2);
}

export const defaultProductLocalConstraintsFormValues: ProductLocalConstraintsFormInput =
	{
		productId: 0,
		constraintType: "",
		value: "",
		scope: "",
		reason: "",
		active: true,
		fromDate: toDateTimeLocalValue(new Date()),
		toDate: "",
	};

export function productLocalConstraintsDetailToFormValues(
	constraint: ProductLocalConstraintsDetail,
): ProductLocalConstraintsFormInput {
	return {
		productId: constraint.product.id,
		constraintType: constraint.constraintType ?? "",
		value: toJsonTextareaValue(constraint.value),
		scope: toJsonTextareaValue(constraint.scope),
		reason: constraint.reason ?? "",
		active: constraint.active,
		fromDate: toDateTimeLocalValue(constraint.fromDate),
		toDate: constraint.toDate ? toDateTimeLocalValue(constraint.toDate) : "",
	};
}
