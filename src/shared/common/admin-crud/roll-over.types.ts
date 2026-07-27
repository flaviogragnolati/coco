import type { z } from "zod";

import type {
	rollOverListInputSchema,
	rollOverListItemSchema,
	rollOverListOutputSchema,
	rollOverResolveInputSchema,
	rollOverResolveOutputSchema,
	rollOverStageSchema,
	rollOverStatsSchema,
	rollOverStatusSchema,
} from "~/schemas/admin/roll-over.schemas";

export type RollOverResolveInput = z.output<typeof rollOverResolveInputSchema>;
export type RollOverResolveOutput = z.output<
	typeof rollOverResolveOutputSchema
>;
export type RollOverStatus = z.output<typeof rollOverStatusSchema>;
export type RollOverStage = z.output<typeof rollOverStageSchema>;
export type RollOverListInput = z.output<typeof rollOverListInputSchema>;
export type RollOverListItem = z.output<typeof rollOverListItemSchema>;
export type RollOverListOutput = z.output<typeof rollOverListOutputSchema>;
export type RollOverStats = z.output<typeof rollOverStatsSchema>;
