import { z } from "zod";

import {
	productIdSchema,
	productUnitSchema,
} from "~/schemas/admin/product.schemas";
import { supplierIdSchema } from "~/schemas/admin/supplier.schemas";
import {
	dateInputSchema,
	decimalOutputSchema,
	optionalDateInputSchema,
	optionalDecimalString,
	requiredDecimalString,
	validateDateRange,
} from "./_crud-schema-helpers";
import { currencySchema } from "./product-client-terms.schemas";

const productReferenceSchema = z.object({
	id: productIdSchema,
	name: z.string(),
	unit: productUnitSchema,
	deleted: z.boolean(),
});

const supplierReferenceSchema = z.object({
	id: supplierIdSchema,
	name: z.string(),
	deleted: z.boolean(),
});

export const productSupplierTermsIdSchema = z
	.number()
	.int("El id debe ser un numero entero")
	.positive("El id debe ser positivo");

const productSupplierTermsInputFieldsSchema = z.object({
	productId: productIdSchema,
	supplierId: supplierIdSchema,
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

export const productSupplierTermsCreateInputSchema =
	productSupplierTermsInputFieldsSchema.superRefine(validateDateRange);

export const productSupplierTermsUpdateInputSchema =
	productSupplierTermsInputFieldsSchema
		.extend({
			id: productSupplierTermsIdSchema,
		})
		.superRefine(validateDateRange);

export const productSupplierTermsDeleteInputSchema = z.object({
	id: productSupplierTermsIdSchema,
});

export const productSupplierTermsListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const productSupplierTermsListItemSchema = z.object({
	id: productSupplierTermsIdSchema,
	product: productReferenceSchema,
	supplier: supplierReferenceSchema,
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

export const productSupplierTermsDetailSchema =
	productSupplierTermsListItemSchema.omit({ updatedAt: true });

export const productSupplierTermsStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const productSupplierTermsListOutputSchema = z.array(
	productSupplierTermsListItemSchema,
);
