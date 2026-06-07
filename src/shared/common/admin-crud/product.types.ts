import type { z } from "zod";

import type {
	productBrandAssignmentSchema,
	productCreateInputSchema,
	productDeleteInputSchema,
	productDetailSchema,
	productIdSchema,
	productListInputSchema,
	productListItemSchema,
	productPreviewSchema,
	productStatsSchema,
	productUnitSchema,
	productUpdateInputSchema,
} from "~/schemas/admin/product.schemas";

export type ProductId = z.output<typeof productIdSchema>;
export type ProductUnit = z.output<typeof productUnitSchema>;
export type ProductBrandAssignment = z.output<
	typeof productBrandAssignmentSchema
>;
export type ProductListInput = z.output<typeof productListInputSchema>;
export type ProductListItem = z.output<typeof productListItemSchema>;
export type ProductDetail = z.output<typeof productDetailSchema>;
export type ProductPreview = z.output<typeof productPreviewSchema>;
export type ProductStats = z.output<typeof productStatsSchema>;
export type ProductCreateInput = z.output<typeof productCreateInputSchema>;
export type ProductUpdateInput = z.output<typeof productUpdateInputSchema>;
export type ProductDeleteInput = z.output<typeof productDeleteInputSchema>;
export type ProductDeleteResult = Pick<ProductDeleteInput, "id">;
export type ProductFormInput = z.input<typeof productCreateInputSchema>;
export type ProductFormValues = z.output<typeof productCreateInputSchema>;
