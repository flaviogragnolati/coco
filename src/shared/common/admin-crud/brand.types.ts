import type { z } from "zod";

import type {
	brandCreateInputSchema,
	brandDeleteInputSchema,
	brandDetailSchema,
	brandListInputSchema,
	brandListItemSchema,
	brandStatsSchema,
	brandUpdateInputSchema,
} from "~/schemas/admin/brand.schemas";

export type BrandListInput = z.output<typeof brandListInputSchema>;
export type BrandListItem = z.output<typeof brandListItemSchema>;
export type BrandDetail = z.output<typeof brandDetailSchema>;
export type BrandStats = z.output<typeof brandStatsSchema>;
export type BrandCreateInput = z.output<typeof brandCreateInputSchema>;
export type BrandUpdateInput = z.output<typeof brandUpdateInputSchema>;
export type BrandDeleteInput = z.output<typeof brandDeleteInputSchema>;
export type BrandDeleteResult = Pick<BrandDeleteInput, "id">;
export type BrandFormInput = z.input<typeof brandCreateInputSchema>;
export type BrandFormValues = z.output<typeof brandCreateInputSchema>;
