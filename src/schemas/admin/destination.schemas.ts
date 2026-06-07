import { z } from "zod";

import { nullishText, optionalUrl, requiredText } from "./_crud-schema-helpers";

export const destinationIdSchema = z
	.number()
	.int("El id debe ser un numero entero")
	.positive("El id debe ser positivo");

export const destinationCreateInputSchema = z.object({
	name: requiredText("El nombre es obligatorio"),
	description: nullishText,
	googleMapsUrl: optionalUrl,
	active: z.boolean().default(true),
});

export const destinationUpdateInputSchema = destinationCreateInputSchema.extend(
	{
		id: destinationIdSchema,
	},
);

export const destinationDeleteInputSchema = z.object({
	id: destinationIdSchema,
});

export const destinationListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const destinationListItemSchema = z.object({
	id: destinationIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	googleMapsUrl: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	updatedAt: z.date(),
});

export const destinationDetailSchema = z.object({
	id: destinationIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	googleMapsUrl: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
});

export const destinationStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const destinationListOutputSchema = z.array(destinationListItemSchema);
