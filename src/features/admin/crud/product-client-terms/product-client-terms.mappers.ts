import type {
	ProductClientTermsDetail,
	ProductClientTermsFormValues,
} from "~/shared/common/admin-crud/product-client-terms.types";
import { toDateTimeLocalValue } from "~/shared/common/date.helpers";

export const defaultProductClientTermsFormValues: ProductClientTermsFormValues =
	{
		productId: 0,
		moq: "",
		moqPrice: "",
		step: "",
		stepPrice: "",
		max: "",
		unitPrice: "",
		marketPrice: "",
		discountPercent: "",
		currency: "ARS",
		active: true,
		fromDate: toDateTimeLocalValue(new Date()),
		toDate: "",
	};

export function productClientTermsDetailToFormValues(
	terms: ProductClientTermsDetail,
): ProductClientTermsFormValues {
	return {
		productId: terms.product.id,
		moq: terms.moq,
		moqPrice: terms.moqPrice,
		step: terms.step ?? "",
		stepPrice: terms.stepPrice ?? "",
		max: terms.max ?? "",
		unitPrice: terms.unitPrice ?? "",
		marketPrice: terms.marketPrice ?? "",
		discountPercent: terms.discountPercent ?? "",
		currency: terms.currency,
		active: terms.active,
		fromDate: toDateTimeLocalValue(terms.fromDate),
		toDate: terms.toDate ? toDateTimeLocalValue(terms.toDate) : "",
	};
}
