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
	moq: decimalStringSchema,
	moqPrice: decimalStringSchema,
	refPrice: decimalStringSchema.nullable(),
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
	refPrice: decimalStringSchema.nullable(),
	currency: homeCurrencySchema.nullable(),
});

export const homeOffersOutputSchema = z.array(homeOfferSchema);

export const homeFeaturedProductsOutputSchema = z.array(
	homeFeaturedProductSchema,
);
