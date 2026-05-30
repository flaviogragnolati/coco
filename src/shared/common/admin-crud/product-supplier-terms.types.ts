import type { z } from "zod";

import type {
	productSupplierTermsCreateInputSchema,
	productSupplierTermsDeleteInputSchema,
	productSupplierTermsDetailSchema,
	productSupplierTermsIdSchema,
	productSupplierTermsListInputSchema,
	productSupplierTermsListItemSchema,
	productSupplierTermsStatsSchema,
	productSupplierTermsUpdateInputSchema,
} from "~/schemas/admin/product-supplier-terms.schemas";

export type ProductSupplierTermsId = z.output<
	typeof productSupplierTermsIdSchema
>;
export type ProductSupplierTermsListInput = z.output<
	typeof productSupplierTermsListInputSchema
>;
export type ProductSupplierTermsListItem = z.output<
	typeof productSupplierTermsListItemSchema
>;
export type ProductSupplierTermsDetail = z.output<
	typeof productSupplierTermsDetailSchema
>;
export type ProductSupplierTermsStats = z.output<
	typeof productSupplierTermsStatsSchema
>;
export type ProductSupplierTermsCreateInput = z.output<
	typeof productSupplierTermsCreateInputSchema
>;
export type ProductSupplierTermsUpdateInput = z.output<
	typeof productSupplierTermsUpdateInputSchema
>;
export type ProductSupplierTermsDeleteInput = z.output<
	typeof productSupplierTermsDeleteInputSchema
>;
export type ProductSupplierTermsDeleteResult = Pick<
	ProductSupplierTermsDeleteInput,
	"id"
>;
export type ProductSupplierTermsFormInput = z.input<
	typeof productSupplierTermsCreateInputSchema
>;
export type ProductSupplierTermsFormValues = z.output<
	typeof productSupplierTermsCreateInputSchema
>;
