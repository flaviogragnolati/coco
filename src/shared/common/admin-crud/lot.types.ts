import type { z } from "zod";

import type {
	lotDetailSchema,
	lotGetByIdInputSchema,
	lotItemStatusSchema,
	lotListInputSchema,
	lotListItemSchema,
	lotListOutputSchema,
	lotStatsSchema,
	lotStatusSchema,
} from "~/schemas/admin/lot.schemas";

export type LotStatus = z.output<typeof lotStatusSchema>;
export type LotItemStatus = z.output<typeof lotItemStatusSchema>;
export type LotListInput = z.output<typeof lotListInputSchema>;
export type LotListItem = z.output<typeof lotListItemSchema>;
export type LotListOutput = z.output<typeof lotListOutputSchema>;
export type LotDetail = z.output<typeof lotDetailSchema>;
export type LotStats = z.output<typeof lotStatsSchema>;
export type LotGetByIdInput = z.output<typeof lotGetByIdInputSchema>;
