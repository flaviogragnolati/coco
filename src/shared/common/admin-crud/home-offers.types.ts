import type { z } from "zod";

import type {
	homeOfferCandidateSchema,
	homeOfferPinSchema,
	homeOfferSetPinnedRankInputSchema,
	homeOfferSetSpotlightInputSchema,
	homeOfferSettingsSchema,
	homeOfferSettingsUpdateInputSchema,
	homeOffersCriterionSchema,
} from "~/schemas/admin/home-offers.schemas";

export type HomeOffersCriterion = z.output<typeof homeOffersCriterionSchema>;
export type HomeOfferSettings = z.output<typeof homeOfferSettingsSchema>;
export type HomeOfferSettingsUpdateInput = z.output<
	typeof homeOfferSettingsUpdateInputSchema
>;
export type HomeOfferSetSpotlightInput = z.output<
	typeof homeOfferSetSpotlightInputSchema
>;
export type HomeOfferSetPinnedRankInput = z.output<
	typeof homeOfferSetPinnedRankInputSchema
>;
export type HomeOfferPin = z.output<typeof homeOfferPinSchema>;
export type HomeOfferCandidate = z.output<typeof homeOfferCandidateSchema>;
