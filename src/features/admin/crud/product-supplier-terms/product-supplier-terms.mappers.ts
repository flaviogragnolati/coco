import type {
	ProductSupplierTermsDetail,
	ProductSupplierTermsFormValues,
} from "~/shared/common/admin-crud/product-supplier-terms.types";
import { toDateTimeLocalValue } from "~/shared/common/date.helpers";

export const defaultProductSupplierTermsFormValues: ProductSupplierTermsFormValues =
	{
		productId: 0,
		supplierId: 0,
		moq: "",
		moqPrice: "",
		step: "",
		stepPrice: "",
		max: "",
		refPrice: "",
		currency: "ARS",
		active: true,
		fromDate: toDateTimeLocalValue(new Date()),
		toDate: "",
	};

export function productSupplierTermsDetailToFormValues(
	terms: ProductSupplierTermsDetail,
): ProductSupplierTermsFormValues {
	return {
		productId: terms.product.id,
		supplierId: terms.supplier.id,
		moq: terms.moq,
		moqPrice: terms.moqPrice,
		step: terms.step ?? "",
		stepPrice: terms.stepPrice ?? "",
		max: terms.max ?? "",
		refPrice: terms.refPrice ?? "",
		currency: terms.currency,
		active: terms.active,
		fromDate: toDateTimeLocalValue(terms.fromDate),
		toDate: terms.toDate ? toDateTimeLocalValue(terms.toDate) : "",
	};
}
