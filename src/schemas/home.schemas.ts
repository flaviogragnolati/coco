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
	productDescription: z.string().nullable(),
	unit: catalogProductUnitSchema,
	brandName: z.string().nullable(),
	imageUrl: z.string().nullable(),
	moq: decimalOutputSchema,
	moqPrice: decimalOutputSchema,
	step: decimalOutputSchema.nullable(),
	stepPrice: decimalOutputSchema.nullable(),
	max: decimalOutputSchema.nullable(),
	fromDate: z.date(),
	toDate: z.date().nullable(),
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
