import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";

export const homeCurrencySchema = z.enum(["ARS", "USD", "EUR", "BRL"]);

export const homeProductUnitSchema = z.enum([
	"kg",
	"lb",
	"piece",
	"box",
	"gr",
	"other",
]);

export const homeOfferSchema = z.object({
	id: z.number().int().positive(),
	productName: z.string(),
	productDescription: z.string().nullable(),
	unit: homeProductUnitSchema,
	brandName: z.string().nullable(),
	imageUrl: z.string().nullable(),
	moq: decimalOutputSchema,
	moqPrice: decimalOutputSchema,
	refPrice: decimalOutputSchema.nullable(),
	currency: homeCurrencySchema,
	fromDate: z.date(),
	toDate: z.date().nullable(),
});

export const homeFeaturedProductSchema = z.object({
	id: z.number().int().positive(),
	productName: z.string(),
	productDescription: z.string().nullable(),
	unit: homeProductUnitSchema,
	brandName: z.string().nullable(),
	imageUrl: z.string().nullable(),
	refPrice: decimalOutputSchema.nullable(),
	currency: homeCurrencySchema.nullable(),
});

export const homeOffersOutputSchema = z.array(homeOfferSchema);

export const homeFeaturedProductsOutputSchema = z.array(
	homeFeaturedProductSchema,
);
