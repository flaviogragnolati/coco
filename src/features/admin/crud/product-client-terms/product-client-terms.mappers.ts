import type { ProductUnit } from "~/shared/common/admin-crud/product.types";
import type {
	ProductClientTermsDetail,
	ProductClientTermsFormValues,
} from "~/shared/common/admin-crud/product-client-terms.types";
import {
	getBaseUnitPrice,
	toMoneyString,
} from "~/shared/common/commerce.helpers";
import { toDateTimeLocalValue } from "~/shared/common/date.helpers";

export const defaultProductClientTermsFormValues: ProductClientTermsFormValues =
	{
		productId: 0,
		unitPrice: "",
		moq: "",
		step: "",
		max: "",
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
		unitPrice: terms.unitPrice ?? legacyUnitPrice(terms),
		moq: terms.moq,
		step: terms.step ?? "",
		max: terms.max ?? "",
		marketPrice: terms.marketPrice ?? "",
		discountPercent: terms.discountPercent ?? "",
		currency: terms.currency,
		active: terms.active,
		fromDate: toDateTimeLocalValue(terms.fromDate),
		toDate: terms.toDate ? toDateTimeLocalValue(terms.toDate) : "",
	};
}

// Terms saved before the unit price was required carry only the minimum price.
function legacyUnitPrice(terms: ProductClientTermsDetail) {
	const unitPrice = getBaseUnitPrice(terms);
	return unitPrice === null ? "" : toMoneyString(unitPrice);
}

/** Kilos sell by the half; everything else by the whole unit. */
export function defaultClientQuantityFor(unit: ProductUnit) {
	return unit === "kg" ? "0.5" : "1";
}
