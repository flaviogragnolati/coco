import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import {
	catalogCurrencySchema,
	catalogProductUnitSchema,
	productPresentationContainerSchema,
} from "~/schemas/catalog.schemas";

export const homeOffersCriterionSchema = z.enum([
	"marketSaving",
	"discountPercent",
	"orderVolume",
]);

export const homeOfferSchema = z.object({
	productId: z.number().int().positive(),
	productClientTermsId: z.number().int().positive(),
	productName: z.string(),
	productDescription: z.string().nullable(),
	unit: catalogProductUnitSchema,
	presentationContainer: productPresentationContainerSchema.nullable(),
	presentationSize: z.string().nullable(),
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

export const homeComboItemSchema = z.object({
	offer: homeOfferSchema,
	quantity: decimalOutputSchema,
	lineTotal: decimalOutputSchema,
});

/** One combo as the card shows it today: only the products with current terms. */
export const homeComboOptionSchema = z.object({
	comboId: z.number().int().positive(),
	name: z.string(),
	description: z.string().nullable(),
	people: z.number().int().positive().nullable(),
	items: z.array(homeComboItemSchema).min(1),
	unavailableNames: z.array(z.string()),
	total: decimalOutputSchema,
	currency: catalogCurrencySchema,
});

/** The combos of one group, shown as one card with a people selector. */
export const homeComboCardSchema = z.object({
	key: z.string(),
	initialComboId: z.number().int().positive(),
	options: z.array(homeComboOptionSchema).min(1),
});

export const homeFeatureSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("product"), offer: homeOfferSchema }),
	z.object({ kind: z.literal("combo"), combo: homeComboCardSchema }),
]);

export const homeContentOutputSchema = z.object({
	spotlight: homeFeatureSchema.nullable(),
	featured: z.array(homeFeatureSchema),
});
