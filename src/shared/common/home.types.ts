import type { z } from "zod";

import type {
	homeContentOutputSchema,
	homeOfferSchema,
} from "~/schemas/home.schemas";

export type HomeOffer = z.output<typeof homeOfferSchema>;

export type HomeContent = z.output<typeof homeContentOutputSchema>;

/** An active pickup point as the delivery FAQ names it. */
export type FaqPickupPoint = {
	name: string;
	line1: string;
	line2: string | null;
	city: string;
	hours: string;
};
