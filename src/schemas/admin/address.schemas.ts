import { z } from "zod";

const requiredText = (message: string) => z.string().trim().min(1, message);

const nullishText = z
	.string()
	.trim()
	.nullish()
	.transform((value) => (value && value.length > 0 ? value : undefined));

export const userIdSchema = z.string().trim().min(1, "Seleccioná un usuario");

export const addressIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const addressTypeSchema = z.enum([
	"all",
	"billing",
	"shipping",
	"other",
]);

export const addressFieldsSchema = z.object({
	type: addressTypeSchema.default("all"),
	line1: requiredText("La dirección es obligatoria"),
	line2: nullishText,
	city: requiredText("La ciudad es obligatoria"),
	state: requiredText("La provincia o estado es obligatorio"),
	postalCode: requiredText("El código postal es obligatorio"),
	country: requiredText("El país es obligatorio"),
	active: z.boolean().default(true),
});

export const addressEmbeddedInputSchema = addressFieldsSchema.extend({
	id: addressIdSchema.optional(),
});

export const addressEmbeddedDetailSchema = z.object({
	id: addressIdSchema,
	type: addressTypeSchema,
	line1: z.string(),
	line2: z.string().nullable(),
	city: z.string(),
	state: z.string(),
	postalCode: z.string(),
	country: z.string(),
	active: z.boolean(),
	deleted: z.boolean(),
});

export const addressCreateInputSchema = addressFieldsSchema.extend({
	userId: userIdSchema,
});

export const addressUpdateInputSchema = addressCreateInputSchema.extend({
	id: addressIdSchema,
});

export const addressDeleteInputSchema = z.object({
	id: addressIdSchema,
});

export const addressListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const addressUserSummarySchema = z.object({
	id: userIdSchema,
	name: z.string(),
	email: z.string(),
	deleted: z.boolean(),
});

export const addressListItemSchema = z.object({
	id: addressIdSchema,
	type: addressTypeSchema,
	line1: z.string(),
	line2: z.string().nullable(),
	city: z.string(),
	state: z.string(),
	postalCode: z.string(),
	country: z.string(),
	active: z.boolean(),
	deleted: z.boolean(),
	updatedAt: z.date(),
	user: addressUserSummarySchema,
});

export const addressDetailSchema = z.object({
	id: addressIdSchema,
	type: addressTypeSchema,
	line1: z.string(),
	line2: z.string().nullable(),
	city: z.string(),
	state: z.string(),
	postalCode: z.string(),
	country: z.string(),
	active: z.boolean(),
	deleted: z.boolean(),
	user: addressUserSummarySchema,
});

export const addressStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const addressListOutputSchema = z.array(addressListItemSchema);
