import { z } from "zod";

import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import {
	productIdSchema,
	productUnitSchema,
} from "~/schemas/admin/product.schemas";
import {
	currencySchema,
	productClientTermsIdSchema,
} from "./product-client-terms.schemas";

export const homeOffersCriterionSchema = z.enum([
	"marketSaving",
	"discountPercent",
]);

export const homeOfferSettingsSchema = z.object({
	spotlightProductId: productIdSchema.nullable(),
	criterion: homeOffersCriterionSchema,
	offersLimit: z.number().int().positive(),
	updatedAt: z.date(),
});

export const homeOfferSettingsUpdateInputSchema = z.object({
	criterion: homeOffersCriterionSchema,
	offersLimit: z
		.number()
		.int("La cantidad de ofertas debe ser un número entero")
		.min(1, "La grilla tiene que mostrar al menos una oferta")
		.max(12, "La grilla no puede mostrar más de 12 ofertas"),
});

/** `null` clears the pick and hands the hero back to the ranking. */
export const homeOfferSetSpotlightInputSchema = z.object({
	productId: productIdSchema.nullable(),
});

/** `null` unfijas the product and returns it to the automatic ranking. */
export const homeOfferSetPinnedRankInputSchema = z.object({
	productId: productIdSchema,
	rank: z
		.number()
		.int("La posición debe ser un número entero")
		.min(1, "La posición fijada empieza en 1")
		.nullable(),
});

export const homeOfferPinSchema = z.object({
	productId: productIdSchema,
	name: z.string(),
	pinnedRank: z.number().int().nullable(),
});

/**
 * A candidate is either offerable (it has vigente client terms and can be
 * pinned or spotlighted) or a leftover pin whose terms expired — listed with
 * `hasCurrentTerms: false` and no prices so the admin can see and clear a pin
 * that stopped rendering instead of wondering where it went.
 */
export const homeOfferCandidateSchema = z.object({
	productId: productIdSchema,
	name: z.string(),
	unit: productUnitSchema,
	brandName: z.string().nullable(),
	pinnedRank: z.number().int().nullable(),
	hasCurrentTerms: z.boolean(),
	currency: currencySchema.nullable(),
	moq: decimalOutputSchema.nullable(),
	moqPrice: decimalOutputSchema.nullable(),
	unitPrice: decimalOutputSchema.nullable(),
	marketPrice: decimalOutputSchema.nullable(),
	discountPercent: decimalOutputSchema.nullable(),
	offerUnitPrice: z.number().nullable(),
	marketSaving: z.number().nullable(),
	productClientTermsId: productClientTermsIdSchema.nullable(),
	termsFromDate: z.date().nullable(),
	termsToDate: z.date().nullable(),
});

export const homeOfferCandidateListOutputSchema = z.array(
	homeOfferCandidateSchema,
);
