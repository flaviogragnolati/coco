import { z } from "zod";

import {
	productIdSchema,
	productUnitSchema,
} from "~/schemas/admin/product.schemas";
import {
	dateInputSchema,
	decimalOutputSchema,
	optionalDateInputSchema,
	optionalDecimalString,
	requiredDecimalString,
	validateDateRange,
} from "./_crud-schema-helpers";

const productReferenceSchema = z.object({
	id: productIdSchema,
	name: z.string(),
	unit: productUnitSchema,
	deleted: z.boolean(),
});

export const productClientTermsIdSchema = z
	.number()
	.int("El id debe ser un numero entero")
	.positive("El id debe ser positivo");

export const currencySchema = z.enum(["ARS", "USD", "EUR", "BRL"]);

const productClientTermsInputFieldsSchema = z.object({
	productId: productIdSchema,
	moq: requiredDecimalString("MOQ", 4),
	moqPrice: requiredDecimalString("Precio MOQ", 2),
	step: optionalDecimalString("Step", 4),
	stepPrice: optionalDecimalString("Precio step", 2),
	max: optionalDecimalString("Maximo", 4),
	refPrice: optionalDecimalString("Precio de referencia", 2),
	currency: currencySchema.default("ARS"),
	active: z.boolean().default(true),
	fromDate: dateInputSchema.default(() => new Date().toISOString()),
	toDate: optionalDateInputSchema,
});

export const productClientTermsCreateInputSchema =
	productClientTermsInputFieldsSchema.superRefine(validateDateRange);

export const productClientTermsUpdateInputSchema =
	productClientTermsInputFieldsSchema
		.extend({
			id: productClientTermsIdSchema,
		})
		.superRefine(validateDateRange);

export const productClientTermsDeleteInputSchema = z.object({
	id: productClientTermsIdSchema,
});

export const productClientTermsListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const productClientTermsListItemSchema = z.object({
	id: productClientTermsIdSchema,
	product: productReferenceSchema,
	moq: decimalOutputSchema,
	moqPrice: decimalOutputSchema,
	step: decimalOutputSchema.nullable(),
	stepPrice: decimalOutputSchema.nullable(),
	max: decimalOutputSchema.nullable(),
	refPrice: decimalOutputSchema.nullable(),
	currency: currencySchema,
	active: z.boolean(),
	deleted: z.boolean(),
	fromDate: z.date(),
	toDate: z.date().nullable(),
	updatedAt: z.date(),
});

export const productClientTermsDetailSchema =
	productClientTermsListItemSchema.omit({ updatedAt: true });

export const productClientTermsStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const productClientTermsListOutputSchema = z.array(
	productClientTermsListItemSchema,
);
