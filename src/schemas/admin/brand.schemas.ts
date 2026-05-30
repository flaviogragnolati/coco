import { z } from "zod";

const requiredText = (message: string) => z.string().trim().min(1, message);

const optionalText = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrl = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined))
	.pipe(z.string().url("Ingresá una URL válida").optional());

export const brandIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const brandCreateInputSchema = z.object({
	name: requiredText("El nombre es obligatorio"),
	description: optionalText,
	logoUrl: optionalUrl,
	active: z.boolean().default(true),
});

export const brandInlineCreateInputSchema = brandCreateInputSchema;

export const brandUpdateInputSchema = brandCreateInputSchema.extend({
	id: brandIdSchema,
});

export const brandDeleteInputSchema = z.object({
	id: brandIdSchema,
});

export const brandListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const brandListItemSchema = z.object({
	id: brandIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	logoUrl: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	updatedAt: z.date(),
});

export const brandDetailSchema = z.object({
	id: brandIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	logoUrl: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
});

export const brandStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const brandListOutputSchema = z.array(brandListItemSchema);
