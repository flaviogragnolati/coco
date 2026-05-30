import type { z } from "zod";

import type {
	currencySchema,
	productClientTermsCreateInputSchema,
	productClientTermsDeleteInputSchema,
	productClientTermsDetailSchema,
	productClientTermsIdSchema,
	productClientTermsListInputSchema,
	productClientTermsListItemSchema,
	productClientTermsStatsSchema,
	productClientTermsUpdateInputSchema,
} from "~/schemas/admin/product-client-terms.schemas";

export type Currency = z.output<typeof currencySchema>;
export type ProductClientTermsId = z.output<typeof productClientTermsIdSchema>;
export type ProductClientTermsListInput = z.output<
	typeof productClientTermsListInputSchema
>;
export type ProductClientTermsListItem = z.output<
	typeof productClientTermsListItemSchema
>;
export type ProductClientTermsDetail = z.output<
	typeof productClientTermsDetailSchema
>;
export type ProductClientTermsStats = z.output<
	typeof productClientTermsStatsSchema
>;
export type ProductClientTermsCreateInput = z.output<
	typeof productClientTermsCreateInputSchema
>;
export type ProductClientTermsUpdateInput = z.output<
	typeof productClientTermsUpdateInputSchema
>;
export type ProductClientTermsDeleteInput = z.output<
	typeof productClientTermsDeleteInputSchema
>;
export type ProductClientTermsDeleteResult = Pick<
	ProductClientTermsDeleteInput,
	"id"
>;
export type ProductClientTermsFormInput = z.input<
	typeof productClientTermsCreateInputSchema
>;
export type ProductClientTermsFormValues = z.output<
	typeof productClientTermsCreateInputSchema
>;
