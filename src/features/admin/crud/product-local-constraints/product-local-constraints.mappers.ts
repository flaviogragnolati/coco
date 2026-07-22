import type {
	ProductLocalConstraintsDetail,
	ProductLocalConstraintsFormInput,
} from "~/shared/common/admin-crud/product-local-constraints.types";
import { toDateTimeLocalValue } from "~/shared/common/date.helpers";

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
