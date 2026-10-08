import { z } from "zod";

export const supplierApplicationIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

/** Derived from `contactedAt`, which is the only stored state. */
export const supplierApplicationStatusSchema = z.enum(["pending", "contacted"]);

export const supplierApplicationListInputSchema = z.object({
	status: z
		.enum([...supplierApplicationStatusSchema.options, "all"])
		.optional()
		.default("all"),
});

export const supplierApplicationMarkContactedInputSchema = z.object({
	id: supplierApplicationIdSchema,
});

export const supplierApplicationListItemSchema = z.object({
	id: supplierApplicationIdSchema,
	contactName: z.string(),
	companyName: z.string(),
	email: z.string().nullable(),
	phone: z.string().nullable(),
	offering: z.string(),
	contactedAt: z.date().nullable(),
	contactedBy: z.object({ id: z.string(), name: z.string() }).nullable(),
	createdAt: z.date(),
});

export const supplierApplicationListOutputSchema = z.array(
	supplierApplicationListItemSchema,
);
