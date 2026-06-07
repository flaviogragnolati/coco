import { z } from "zod";

import {
	productIdSchema,
	productUnitSchema,
} from "~/schemas/admin/product.schemas";
import {
	dateInputSchema,
	jsonTextareaSchema,
	nullishText,
	optionalDateInputSchema,
	validateDateRange,
} from "./_crud-schema-helpers";

const productReferenceSchema = z.object({
	id: productIdSchema,
	name: z.string(),
	unit: productUnitSchema,
	deleted: z.boolean(),
});

export const productLocalConstraintsIdSchema = z
	.number()
	.int("El id debe ser un numero entero")
	.positive("El id debe ser positivo");

export const productLocalConstraintTypeSchema = z.enum([
	"max_quantity",
	"restricted_destination",
	"requires_internal_delivery",
	"minimum_stock",
	"legal_restriction",
	"seasonal_availability",
]);

const optionalConstraintTypeSchema = z.preprocess(
	(value) => (value === "" ? undefined : value),
	productLocalConstraintTypeSchema.optional(),
);

const productLocalConstraintsInputFieldsSchema = z.object({
	productId: productIdSchema,
	constraintType: optionalConstraintTypeSchema.optional(),
	value: jsonTextareaSchema,
	scope: jsonTextareaSchema,
	reason: nullishText,
	active: z.boolean().default(true),
	fromDate: dateInputSchema.default(() => new Date().toISOString()),
	toDate: optionalDateInputSchema,
});

export const productLocalConstraintsCreateInputSchema =
	productLocalConstraintsInputFieldsSchema.superRefine(validateDateRange);

export const productLocalConstraintsUpdateInputSchema =
	productLocalConstraintsInputFieldsSchema
		.extend({
			id: productLocalConstraintsIdSchema,
		})
		.superRefine(validateDateRange);

export const productLocalConstraintsDeleteInputSchema = z.object({
	id: productLocalConstraintsIdSchema,
});

export const productLocalConstraintsListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const productLocalConstraintsListItemSchema = z.object({
	id: productLocalConstraintsIdSchema,
	product: productReferenceSchema,
	constraintType: productLocalConstraintTypeSchema.nullable(),
	value: z.unknown().nullable(),
	scope: z.unknown().nullable(),
	reason: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	fromDate: z.date(),
	toDate: z.date().nullable(),
	updatedAt: z.date(),
});

export const productLocalConstraintsDetailSchema =
	productLocalConstraintsListItemSchema.omit({ updatedAt: true });

export const productLocalConstraintsStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const productLocalConstraintsListOutputSchema = z.array(
	productLocalConstraintsListItemSchema,
);
