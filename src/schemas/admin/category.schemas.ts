import { z } from "zod";

import { requiredText } from "./_crud-schema-helpers";

export const categoryIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const categoryCreateInputSchema = z.object({
	name: requiredText("El nombre es obligatorio"),
	sortOrder: z
		.number({ error: "Ingresá el orden" })
		.int("El orden debe ser un número entero")
		.min(0, "El orden no puede ser negativo")
		.max(9999, "El orden no puede superar 9999"),
	active: z.boolean().default(true),
});

export const categoryUpdateInputSchema = categoryCreateInputSchema.extend({
	id: categoryIdSchema,
});

export const categoryDeleteInputSchema = z.object({
	id: categoryIdSchema,
});

export const categoryListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const categoryListItemSchema = z.object({
	id: categoryIdSchema,
	name: z.string(),
	sortOrder: z.number().int(),
	productCount: z.number().int().nonnegative(),
	active: z.boolean(),
	deleted: z.boolean(),
	updatedAt: z.date(),
});

export const categoryDetailSchema = z.object({
	id: categoryIdSchema,
	name: z.string(),
	sortOrder: z.number().int(),
	active: z.boolean(),
	deleted: z.boolean(),
});

export const categoryStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const categoryListOutputSchema = z.array(categoryListItemSchema);
