import type { z } from "zod";

import type {
	homeContentOutputSchema,
	homeOfferSchema,
} from "~/schemas/home.schemas";

export type HomeOffer = z.output<typeof homeOfferSchema>;

export type HomeContent = z.output<typeof homeContentOutputSchema>;
