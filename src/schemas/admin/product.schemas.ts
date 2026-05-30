import { z } from "zod";

import {
	brandIdSchema,
	brandInlineCreateInputSchema,
} from "~/schemas/admin/brand.schemas";
import { supplierIdSchema } from "~/schemas/admin/supplier.schemas";

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

const imageUrlSchema = z.string().trim().url("Ingresá una URL válida");

const productReferenceBrandSchema = z.object({
	id: brandIdSchema,
	name: z.string(),
	deleted: z.boolean(),
});

const productReferenceSupplierSchema = z.object({
	id: supplierIdSchema,
	name: z.string(),
	deleted: z.boolean(),
});

export const productIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const productUnitSchema = z.enum([
	"kg",
	"lb",
	"piece",
	"box",
	"gr",
	"other",
]);

export const productBrandAssignmentSchema = z.discriminatedUnion("mode", [
	z.object({
		mode: z.literal("none"),
	}),
	z.object({
		mode: z.literal("existing"),
		brandId: brandIdSchema,
	}),
	z.object({
		mode: z.literal("new"),
		brand: brandInlineCreateInputSchema,
	}),
]);

export const productCreateInputSchema = z.object({
	name: requiredText("El nombre es obligatorio"),
	description: optionalText,
	cartImageUrl: optionalUrl,
	cardImageUrl: optionalUrl,
	images: z.array(imageUrlSchema).default([]),
	unit: productUnitSchema,
	brandAssignment: productBrandAssignmentSchema,
	defaultSupplierId: supplierIdSchema.optional(),
	active: z.boolean().default(true),
});

export const productUpdateInputSchema = productCreateInputSchema.extend({
	id: productIdSchema,
});

export const productDeleteInputSchema = z.object({
	id: productIdSchema,
});

export const productListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const productListItemSchema = z.object({
	id: productIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	unit: productUnitSchema,
	cartImageUrl: z.string().nullable(),
	brand: productReferenceBrandSchema.nullable(),
	defaultSupplier: productReferenceSupplierSchema.nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	updatedAt: z.date(),
});

export const productDetailSchema = z.object({
	id: productIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	cartImageUrl: z.string().nullable(),
	cardImageUrl: z.string().nullable(),
	images: z.array(z.string()),
	unit: productUnitSchema,
	brand: productReferenceBrandSchema.nullable(),
	defaultSupplier: productReferenceSupplierSchema.nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
});

export const productStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const productListOutputSchema = z.array(productListItemSchema);
