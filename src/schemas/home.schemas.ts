import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import {
	catalogCurrencySchema,
	catalogProductUnitSchema,
} from "~/schemas/catalog.schemas";

export const homeOfferSchema = z.object({
	productId: z.number().int().positive(),
	productClientTermsId: z.number().int().positive(),
	productName: z.string(),
	unit: catalogProductUnitSchema,
	brandName: z.string().nullable(),
	imageUrl: z.string().nullable(),
	moq: decimalOutputSchema,
	moqPrice: decimalOutputSchema,
	unitPrice: decimalOutputSchema.nullable(),
	marketPrice: decimalOutputSchema.nullable(),
	discountPercent: decimalOutputSchema.nullable(),
	currency: catalogCurrencySchema,
});

export const homeOffersOutputSchema = z.array(homeOfferSchema);

export const homeContentOutputSchema = z.object({
	spotlight: homeOfferSchema.nullable(),
	offers: homeOffersOutputSchema,
});
