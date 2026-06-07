import { z } from "zod";

const requiredText = (message: string) => z.string().trim().min(1, message);

const nullishText = z
	.string()
	.trim()
	.nullish()
	.transform((value) => (value && value.length > 0 ? value : undefined));

const optionalEmail = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined))
	.pipe(z.string().email("Ingresá un email válido").optional());

export const supplierIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const supplierAddressSchema = z.object({
	line1: requiredText("La dirección es obligatoria"),
	line2: nullishText,
	city: requiredText("La ciudad es obligatoria"),
	state: requiredText("La provincia o estado es obligatorio"),
	postalCode: requiredText("El código postal es obligatorio"),
	country: requiredText("El país es obligatorio"),
});

export const supplierContactInfoSchema = z
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
				message: "Completá al menos un medio de contacto",
				path: ["email"],
			});
		}
	});

export const supplierCreateInputSchema = z.object({
	name: requiredText("El nombre es obligatorio"),
	description: nullishText,
	active: z.boolean().default(true),
	address: supplierAddressSchema,
	contactInfo: supplierContactInfoSchema,
});

export const supplierUpdateInputSchema = supplierCreateInputSchema.extend({
	id: supplierIdSchema,
});

export const supplierDeleteInputSchema = z.object({
	id: supplierIdSchema,
});

export const supplierListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const supplierListItemSchema = z.object({
	id: supplierIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	updatedAt: z.date(),
});

export const supplierDetailSchema = z.object({
	id: supplierIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	address: supplierAddressSchema,
	contactInfo: supplierContactInfoSchema,
});

export const supplierStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const supplierListOutputSchema = z.array(supplierListItemSchema);
