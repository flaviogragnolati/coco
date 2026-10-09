import { z } from "zod";

import { nullishText, optionalUrl, requiredText } from "./_crud-schema-helpers";

export const pickupPointIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const pickupPointCreateInputSchema = z.object({
	name: requiredText("El nombre es obligatorio"),
	line1: requiredText("La dirección es obligatoria"),
	line2: nullishText,
	city: requiredText("La ciudad es obligatoria"),
	state: requiredText("La provincia es obligatoria"),
	postalCode: nullishText,
	country: requiredText("El país es obligatorio").default("AR"),
	googleMapsUrl: optionalUrl,
	hours: requiredText("Los horarios son obligatorios"),
	instructions: nullishText,
	active: z.boolean().default(true),
});

export const pickupPointUpdateInputSchema = pickupPointCreateInputSchema.extend(
	{
		id: pickupPointIdSchema,
	},
);

export const pickupPointSetActiveInputSchema = z.object({
	id: pickupPointIdSchema,
	active: z.boolean(),
});

export const pickupPointDeleteInputSchema = z.object({
	id: pickupPointIdSchema,
});

export const pickupPointListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const pickupPointDetailSchema = z.object({
	id: pickupPointIdSchema,
	name: z.string(),
	line1: z.string(),
	line2: z.string().nullable(),
	city: z.string(),
	state: z.string(),
	postalCode: z.string().nullable(),
	country: z.string(),
	googleMapsUrl: z.string().nullable(),
	hours: z.string(),
	instructions: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
});

export const pickupPointListItemSchema = pickupPointDetailSchema.extend({
	updatedAt: z.date(),
	/** Paid orders still in progress that chose this point. */
	pendingOrderCount: z.number().int().nonnegative(),
});

export const pickupPointStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const pickupPointListOutputSchema = z.array(pickupPointListItemSchema);
