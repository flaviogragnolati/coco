import { z } from "zod";

import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import {
	productIdSchema,
	productUnitSchema,
} from "~/schemas/admin/product.schemas";
import { homeOffersCriterionSchema } from "~/schemas/home.schemas";
import { comboIdSchema } from "./combo.schemas";
import {
	currencySchema,
	productClientTermsIdSchema,
} from "./product-client-terms.schemas";

export const featuredTargetSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("product"), productId: productIdSchema }),
	z.object({ kind: z.literal("combo"), comboId: comboIdSchema }),
]);

export const homeOfferSettingsSchema = z.object({
	spotlight: featuredTargetSchema.nullable(),
	criterion: homeOffersCriterionSchema,
	offersLimit: z.number().int().positive(),
	fillWithRanking: z.boolean(),
	updatedAt: z.date(),
});

export const homeOfferSettingsUpdateInputSchema = z.object({
	criterion: homeOffersCriterionSchema,
	offersLimit: z
		.number()
		.int("La cantidad de lugares debe ser un número entero")
		.min(1, "La sección tiene que mostrar al menos un destacado")
		.max(12, "La sección no puede mostrar más de 12 destacados"),
	fillWithRanking: z.boolean(),
});

/** `null` clears the pick: the band goes to the ranking, or away when it is off. */
export const homeOfferSetSpotlightInputSchema = z.object({
	target: featuredTargetSchema.nullable(),
});

/**
 * - `noPrice`: a product without current terms, or a combo with none of its
 *   products available; the home skips it.
 * - `inactive`: a combo switched off in Combos.
 * - `sharedCard`: a combo whose group already shows, through a sibling higher
 *   in the list or in the band; it takes no place of its own.
 */
export const homeFeaturedStatusSchema = z.enum([
	"shown",
	"noPrice",
	"inactive",
	"sharedCard",
]);

export const homeFeaturedListItemSchema = z.object({
	id: z.number().int().positive(),
	position: z.number().int(),
	target: featuredTargetSchema,
	name: z.string(),
	status: homeFeaturedStatusSchema,
	sharedWithName: z.string().nullable(),
});

export const homeFeaturedAddInputSchema = z.object({
	target: featuredTargetSchema,
});

export const homeFeaturedRemoveInputSchema = z.object({
	id: z.number().int().positive(),
});

/** Every id of the list, in the new order: a partial list is refused. */
export const homeFeaturedReorderInputSchema = z.object({
	ids: z.array(z.number().int().positive()).min(1).max(50),
});

export const homeComboCandidateSchema = z.object({
	comboId: comboIdSchema,
	name: z.string(),
	people: z.number().int().positive().nullable(),
	groupName: z.string().nullable(),
	active: z.boolean(),
});

const previewEntrySchema = z.object({
	kind: z.enum(["product", "combo"]),
	name: z.string(),
	source: z.enum(["list", "ranking"]),
});

export const homeFeaturedPreviewSchema = z.object({
	spotlight: previewEntrySchema.nullable(),
	featured: z.array(previewEntrySchema),
});

/** A product the home can show today: it has current client terms. */
export const homeOfferCandidateSchema = z.object({
	productId: productIdSchema,
	name: z.string(),
	unit: productUnitSchema,
	brandName: z.string().nullable(),
	currency: currencySchema,
	moq: decimalOutputSchema,
	moqPrice: decimalOutputSchema,
	unitPrice: decimalOutputSchema.nullable(),
	marketPrice: decimalOutputSchema.nullable(),
	discountPercent: decimalOutputSchema.nullable(),
	offerUnitPrice: z.number().nullable(),
	marketSaving: z.number().nullable(),
	paidOrderCount: z.number().int().nonnegative(),
	productClientTermsId: productClientTermsIdSchema,
	termsFromDate: z.date(),
	termsToDate: z.date().nullable(),
});

export const homeOfferCandidateListOutputSchema = z.array(
	homeOfferCandidateSchema,
);
export const homeFeaturedListOutputSchema = z.array(homeFeaturedListItemSchema);
export const homeComboCandidateListOutputSchema = z.array(
	homeComboCandidateSchema,
);
