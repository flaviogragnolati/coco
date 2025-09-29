import { z } from "zod";

const baseSupplierSchema = z.object({
	name: z
		.string()
		.min(1, "Supplier name is required")
		.max(255, "Supplier name must be less than 255 characters")
		.trim(),
	description: z
		.string()
		.max(1000, "Description must be less than 1000 characters")
		.trim()
		.optional()
		.nullable(),
	image: z.string().url("Image must be a valid URL").optional().nullable(),
	phone: z
		.string()
		.regex(/^\+?[\d\s\-\(\)\.]{7,20}$/, "Phone number must be a valid format")
		.optional()
		.nullable(),
	email: z
		.string()
		.email("Email must be a valid email address")
		.optional()
		.nullable(),
	website: z.string().url("Website must be a valid URL").optional().nullable(),
	taxId: z
		.string()
		.min(1, "Tax ID cannot be empty")
		.max(50, "Tax ID must be less than 50 characters")
		.trim()
		.optional()
		.nullable(),
	taxType: z
		.string()
		.min(1, "Tax type cannot be empty")
		.max(20, "Tax type must be less than 20 characters")
		.trim()
		.optional()
		.nullable(),
	isActive: z.boolean(),
});

export const createSupplierSchema = baseSupplierSchema;

export const updateSupplierSchema = createSupplierSchema.partial().extend({
	id: z.number().int().positive("Supplier ID must be a positive integer"),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
