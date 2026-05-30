import type { z } from "zod";

import type {
	homeCurrencySchema,
	homeFeaturedProductSchema,
	homeOfferSchema,
	homeProductUnitSchema,
} from "~/schemas/home.schemas";

export type HomeCurrency = z.output<typeof homeCurrencySchema>;
export type HomeProductUnit = z.output<typeof homeProductUnitSchema>;
export type HomeOffer = z.output<typeof homeOfferSchema>;
export type HomeFeaturedProduct = z.output<typeof homeFeaturedProductSchema>;
