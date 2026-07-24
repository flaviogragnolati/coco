import type { z } from "zod";

import type { homeOfferSchema } from "~/schemas/home.schemas";

export type HomeOffer = z.output<typeof homeOfferSchema>;
