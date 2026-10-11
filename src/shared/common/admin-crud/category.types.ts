import type { z } from "zod";

import type {
	categoryCreateInputSchema,
	categoryDeleteInputSchema,
	categoryDetailSchema,
	categoryListInputSchema,
	categoryListItemSchema,
	categoryStatsSchema,
	categoryUpdateInputSchema,
} from "~/schemas/admin/category.schemas";

export type CategoryListInput = z.output<typeof categoryListInputSchema>;
export type CategoryListItem = z.output<typeof categoryListItemSchema>;
export type CategoryDetail = z.output<typeof categoryDetailSchema>;
export type CategoryStats = z.output<typeof categoryStatsSchema>;
export type CategoryCreateInput = z.output<typeof categoryCreateInputSchema>;
export type CategoryUpdateInput = z.output<typeof categoryUpdateInputSchema>;
export type CategoryDeleteInput = z.output<typeof categoryDeleteInputSchema>;
export type CategoryDeleteResult = Pick<CategoryDeleteInput, "id">;
export type CategoryFormInput = z.input<typeof categoryCreateInputSchema>;
export type CategoryFormValues = z.output<typeof categoryCreateInputSchema>;
