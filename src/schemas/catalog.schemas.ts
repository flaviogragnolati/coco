import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";

export const catalogCurrencySchema = z.enum(["ARS", "USD", "EUR", "BRL"]);

export const catalogProductUnitSchema = z.enum([
	"kg",
	"lb",
	"piece",
	"box",
	"gr",
	"other",
]);

export const catalogBrandSummarySchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
});

export const catalogClientTermsSchema = z.object({
	id: z.number().int().positive(),
	moq: decimalOutputSchema,
	moqPrice: decimalOutputSchema,
	step: decimalOutputSchema.nullable(),
	stepPrice: decimalOutputSchema.nullable(),
	max: decimalOutputSchema.nullable(),
	refPrice: decimalOutputSchema.nullable(),
	currency: catalogCurrencySchema,
	fromDate: z.date(),
	toDate: z.date().nullable(),
});

export const catalogProductListItemSchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	description: z.string().nullable(),
	unit: catalogProductUnitSchema,
	brand: catalogBrandSummarySchema.nullable(),
	imageUrl: z.string().nullable(),
	createdAt: z.date(),
	terms: catalogClientTermsSchema,
});

export const catalogProductDetailInputSchema = z.object({
	id: z.number().int().positive(),
});

export const catalogProductDetailSchema = catalogProductListItemSchema.extend({
	cardImageUrl: z.string().nullable(),
	cartImageUrl: z.string().nullable(),
	images: z.array(z.string()),
});

export const catalogProductListOutputSchema = z.array(
	catalogProductListItemSchema,
);
