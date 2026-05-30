import type {
	ProductSupplierTermsDetail,
	ProductSupplierTermsFormValues,
} from "~/shared/common/admin-crud/product-supplier-terms.types";

function toDateTimeLocalValue(value: Date | string) {
	const date = new Date(value);
	const pad = (part: number) => String(part).padStart(2, "0");

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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
