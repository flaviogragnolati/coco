import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import {
	catalogCurrencySchema,
	catalogProductUnitSchema,
	productPresentationContainerSchema,
} from "~/schemas/catalog.schemas";
import { requiredText } from "./_crud-schema-helpers";

export const comboIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

const optionalTrimmedText = (max: number, message: string) =>
	z
		.string()
		.trim()
		.max(max, message)
		.nullish()
		.transform((value) => (value ? value : null));

export const comboItemInputSchema = z.object({
	productId: z.number().int().positive("Elegí un producto"),
	quantity: z
		.string()
		.trim()
		.refine((value) => {
			const parsed = Number(value);
			return value !== "" && Number.isFinite(parsed) && parsed > 0;
		}, "La cantidad tiene que ser mayor a cero"),
});

export const comboCreateInputSchema = z.object({
	name: requiredText("El nombre es obligatorio").max(
		80,
		"El nombre no puede superar 80 caracteres",
	),
	description: optionalTrimmedText(
		500,
		"La descripción no puede superar 500 caracteres",
	),
	people: z
		.number()
		.int("Las personas tienen que ser un número entero")
		.min(1, "Tiene que ser para al menos 1 persona")
		.max(20, "Hasta 20 personas")
		.nullable(),
	groupName: optionalTrimmedText(60, "El grupo no puede superar 60 caracteres"),
	active: z.boolean().default(true),
	items: z
		.array(comboItemInputSchema)
		.min(1, "Agregá al menos un producto")
		.max(20, "Hasta 20 productos por combo"),
});

export const comboUpdateInputSchema = comboCreateInputSchema.extend({
	id: comboIdSchema,
});

export const comboDeleteInputSchema = z.object({
	id: comboIdSchema,
});

export const comboListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

export const comboListItemSchema = z.object({
	id: comboIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	people: z.number().int().positive().nullable(),
	groupName: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	itemCount: z.number().int().nonnegative(),
	/** Products without current terms: the home leaves them out of the card. */
	unavailableProductNames: z.array(z.string()),
	shownOnHome: z.boolean(),
	updatedAt: z.date(),
});

export const comboDetailItemSchema = z.object({
	productId: z.number().int().positive(),
	productName: z.string(),
	quantity: decimalOutputSchema,
	unit: catalogProductUnitSchema,
	presentationContainer: productPresentationContainerSchema.nullable(),
	presentationSize: z.string().nullable(),
});

export const comboDetailSchema = z.object({
	id: comboIdSchema,
	name: z.string(),
	description: z.string().nullable(),
	people: z.number().int().positive().nullable(),
	groupName: z.string().nullable(),
	active: z.boolean(),
	deleted: z.boolean(),
	items: z.array(comboDetailItemSchema),
});

export const comboStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	active: z.number().int().nonnegative(),
	inactive: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

/** A product with current terms, with what the quantity field must respect. */
export const comboProductOptionSchema = z.object({
	productId: z.number().int().positive(),
	name: z.string(),
	unit: catalogProductUnitSchema,
	presentationContainer: productPresentationContainerSchema.nullable(),
	presentationSize: z.string().nullable(),
	moq: decimalOutputSchema,
	step: decimalOutputSchema.nullable(),
	max: decimalOutputSchema.nullable(),
	currency: catalogCurrencySchema,
});

export const comboListOutputSchema = z.array(comboListItemSchema);
export const comboProductOptionListSchema = z.array(comboProductOptionSchema);
export const comboGroupOptionsSchema = z.array(z.string());
