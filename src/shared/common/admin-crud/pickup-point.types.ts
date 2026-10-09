import type { z } from "zod";

import type {
	pickupPointCreateInputSchema,
	pickupPointDeleteInputSchema,
	pickupPointDetailSchema,
	pickupPointListInputSchema,
	pickupPointListItemSchema,
	pickupPointSetActiveInputSchema,
	pickupPointStatsSchema,
	pickupPointUpdateInputSchema,
} from "~/schemas/admin/pickup-point.schemas";

export type PickupPointListInput = z.output<typeof pickupPointListInputSchema>;
export type PickupPointListItem = z.output<typeof pickupPointListItemSchema>;
export type PickupPointDetail = z.output<typeof pickupPointDetailSchema>;
export type PickupPointStats = z.output<typeof pickupPointStatsSchema>;
export type PickupPointCreateInput = z.output<
	typeof pickupPointCreateInputSchema
>;
export type PickupPointUpdateInput = z.output<
	typeof pickupPointUpdateInputSchema
>;
export type PickupPointSetActiveInput = z.output<
	typeof pickupPointSetActiveInputSchema
>;
export type PickupPointDeleteInput = z.output<
	typeof pickupPointDeleteInputSchema
>;
export type PickupPointFormInput = z.input<typeof pickupPointCreateInputSchema>;
export type PickupPointFormValues = z.output<
	typeof pickupPointCreateInputSchema
>;
