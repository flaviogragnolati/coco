import type { z } from "zod";

import type {
	homeComboCardSchema,
	homeComboItemSchema,
	homeComboOptionSchema,
	homeContentOutputSchema,
	homeFeatureSchema,
	homeOfferSchema,
} from "~/schemas/home.schemas";

export type HomeOffer = z.output<typeof homeOfferSchema>;

export type HomeComboItem = z.output<typeof homeComboItemSchema>;

export type HomeComboOption = z.output<typeof homeComboOptionSchema>;

export type HomeComboCard = z.output<typeof homeComboCardSchema>;

export type HomeFeature = z.output<typeof homeFeatureSchema>;

export type HomeContent = z.output<typeof homeContentOutputSchema>;

/** An active pickup point as the delivery FAQ names it. */
export type FaqPickupPoint = {
	name: string;
	line1: string;
	line2: string | null;
	city: string;
	hours: string;
};
