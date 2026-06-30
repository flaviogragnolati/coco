import { z } from "zod";

const decimalStringSchema = z.preprocess((value) => {
	if (value === null || value === undefined) return value;
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	if (
		typeof value === "object" &&
		"toString" in value &&
		typeof value.toString === "function"
	) {
		return value.toString();
	}
	return value;
}, z.string());

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
	moq: decimalStringSchema,
	moqPrice: decimalStringSchema,
	step: decimalStringSchema.nullable(),
	stepPrice: decimalStringSchema.nullable(),
	max: decimalStringSchema.nullable(),
	refPrice: decimalStringSchema.nullable(),
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
