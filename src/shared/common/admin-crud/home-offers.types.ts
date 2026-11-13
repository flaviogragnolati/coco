import type { z } from "zod";

import type {
	featuredTargetSchema,
	homeComboCandidateSchema,
	homeFeaturedAddInputSchema,
	homeFeaturedListItemSchema,
	homeFeaturedPreviewSchema,
	homeFeaturedRemoveInputSchema,
	homeFeaturedReorderInputSchema,
	homeOfferCandidateSchema,
	homeOfferSetSpotlightInputSchema,
	homeOfferSettingsSchema,
	homeOfferSettingsUpdateInputSchema,
} from "~/schemas/admin/home-offers.schemas";
import type { homeOffersCriterionSchema } from "~/schemas/home.schemas";

export type HomeOffersCriterion = z.output<typeof homeOffersCriterionSchema>;
export type FeaturedTargetInput = z.output<typeof featuredTargetSchema>;
export type HomeOfferSettings = z.output<typeof homeOfferSettingsSchema>;
export type HomeOfferSettingsUpdateInput = z.output<
	typeof homeOfferSettingsUpdateInputSchema
>;
export type HomeOfferSetSpotlightInput = z.output<
	typeof homeOfferSetSpotlightInputSchema
>;
export type HomeOfferCandidate = z.output<typeof homeOfferCandidateSchema>;
export type HomeFeaturedListItem = z.output<typeof homeFeaturedListItemSchema>;
export type HomeFeaturedAddInput = z.output<typeof homeFeaturedAddInputSchema>;
export type HomeFeaturedRemoveInput = z.output<
	typeof homeFeaturedRemoveInputSchema
>;
export type HomeFeaturedReorderInput = z.output<
	typeof homeFeaturedReorderInputSchema
>;
export type HomeComboCandidate = z.output<typeof homeComboCandidateSchema>;
export type HomeFeaturedPreview = z.output<typeof homeFeaturedPreviewSchema>;
