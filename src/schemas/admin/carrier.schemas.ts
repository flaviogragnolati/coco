import { z } from "zod";

import { nullishText, requiredText } from "./_crud-schema-helpers";

const optionalEmail = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined))
	.pipe(z.string().email("Ingresa un email valido").optional());

export const carrierIdSchema = z
	.number()
	.int("El id debe ser un numero entero")
	.positive("El id debe ser positivo");

export const carrierAddressSchema = z.object({
	line1: requiredText("La direccion es obligatoria"),
	line2: nullishText,
	city: requiredText("La ciudad es obligatoria"),
	state: requiredText("La provincia o estado es obligatorio"),
	postalCode: requiredText("El codigo postal es obligatorio"),
	country: requiredText("El pais es obligatorio"),
});

export const carrierContactInfoSchema = z
	.object({
		contactName: requiredText("El nombre de contacto es obligatorio"),
		email: optionalEmail,
		phone: nullishText,
		whatsapp: nullishText,
	})
	.superRefine((value, ctx) => {
		if (!value.email && !value.phone && !value.whatsapp) {
			ctx.addIssue({
				code: "custom",
				message: "Completa al menos un medio de contacto",
				path: ["email"],
			});
		}
	});

export const carrierCreateInputSchema = z.object({
	name: requiredText("El nombre es obligatorio"),
	description: nullishText,
	active: z.boolean().default(true),
	address: carrierAddressSchema,
	contactInfo: carrierContactInfoSchema,
});

export const carrierUpdateInputSchema = carrierCreateInputSchema.extend({
	id: carrierIdSchema,
});

export const carrierDeleteInputSchema = z.object({
	id: carrierIdSchema,
});

export const carrierListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const carrierListItemSchema = z.object({
	id: carrierIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	updatedAt: z.date(),
});

export const carrierDetailSchema = z.object({
	id: carrierIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	address: carrierAddressSchema,
	contactInfo: carrierContactInfoSchema,
});

export const carrierStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const carrierListOutputSchema = z.array(carrierListItemSchema);
