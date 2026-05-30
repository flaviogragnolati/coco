import type { z } from "zod";

import type {
	destinationCreateInputSchema,
	destinationDeleteInputSchema,
	destinationDetailSchema,
	destinationListInputSchema,
	destinationListItemSchema,
	destinationStatsSchema,
	destinationUpdateInputSchema,
} from "~/schemas/admin/destination.schemas";

export type DestinationListInput = z.output<typeof destinationListInputSchema>;
export type DestinationListItem = z.output<typeof destinationListItemSchema>;
export type DestinationDetail = z.output<typeof destinationDetailSchema>;
export type DestinationStats = z.output<typeof destinationStatsSchema>;
export type DestinationCreateInput = z.output<
	typeof destinationCreateInputSchema
>;
export type DestinationUpdateInput = z.output<
	typeof destinationUpdateInputSchema
>;
export type DestinationDeleteInput = z.output<
	typeof destinationDeleteInputSchema
>;
export type DestinationDeleteResult = Pick<DestinationDeleteInput, "id">;
export type DestinationFormInput = z.input<typeof destinationCreateInputSchema>;
export type DestinationFormValues = z.output<
	typeof destinationCreateInputSchema
>;
