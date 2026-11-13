import type { z } from "zod";

import type {
	comboCreateInputSchema,
	comboDeleteInputSchema,
	comboDetailSchema,
	comboListInputSchema,
	comboListItemSchema,
	comboProductOptionSchema,
	comboStatsSchema,
	comboUpdateInputSchema,
} from "~/schemas/admin/combo.schemas";

export type ComboListInput = z.output<typeof comboListInputSchema>;
export type ComboListItem = z.output<typeof comboListItemSchema>;
export type ComboDetail = z.output<typeof comboDetailSchema>;
export type ComboStats = z.output<typeof comboStatsSchema>;
export type ComboCreateInput = z.output<typeof comboCreateInputSchema>;
export type ComboUpdateInput = z.output<typeof comboUpdateInputSchema>;
export type ComboDeleteInput = z.output<typeof comboDeleteInputSchema>;
export type ComboProductOption = z.output<typeof comboProductOptionSchema>;
export type ComboFormValues = z.input<typeof comboCreateInputSchema>;
