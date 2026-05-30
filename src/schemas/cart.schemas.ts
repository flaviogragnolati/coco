import { z } from "zod";
import {
	catalogClientTermsSchema,
	catalogCurrencySchema,
	catalogProductUnitSchema,
} from "~/schemas/catalog.schemas";

const decimalStringSchema = z.preprocess((value) => {
	if (value === null || value === undefined) return value;
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	if (
		typeof value === "object" &&
		"toString" in value &&
		typeof value.toString === "function"
	) {
		return value.toString();
	}
	return value;
}, z.string());

const positiveDecimalStringSchema = decimalStringSchema.refine((value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0;
}, "La cantidad debe ser mayor a cero");

export const cartStatusSchema = z.enum([
	"draft",
	"pending",
	"atCheckout",
	"submitted",
	"abandoned",
	"cancelled",
	"aborted",
]);

export const cartProductSummarySchema = z.object({
	id: z.number().int().positive(),
	name: z.string(),
	description: z.string().nullable(),
	unit: catalogProductUnitSchema,
	brandName: z.string().nullable(),
	imageUrl: z.string().nullable(),
});

export const cartItemSchema = z.object({
	productClientTermsId: z.number().int().positive(),
	quantity: decimalStringSchema,
	lineTotal: decimalStringSchema,
	product: cartProductSummarySchema,
	terms: catalogClientTermsSchema,
});

export const cartTotalSchema = z.object({
	currency: catalogCurrencySchema,
	amount: decimalStringSchema,
});

export const cartSnapshotSchema = z.object({
	id: z.number().int().positive().nullable(),
	code: z.string().nullable(),
	status: cartStatusSchema.nullable(),
	items: z.array(cartItemSchema),
	itemCount: z.number().int().nonnegative(),
	totalQuantity: decimalStringSchema,
	totals: z.array(cartTotalSchema),
});

export const cartLocalItemInputSchema = z.object({
	productClientTermsId: z.number().int().positive(),
	quantity: positiveDecimalStringSchema,
});

export const cartSyncInputSchema = z.object({
	items: z.array(cartLocalItemInputSchema).default([]),
});

export const cartSetItemQuantityInputSchema = cartLocalItemInputSchema;

export const cartRemoveItemInputSchema = z.object({
	productClientTermsId: z.number().int().positive(),
});

export const cartWarningSchema = z.object({
	type: z.enum(["item_unavailable", "quantity_adjusted"]),
	productClientTermsId: z.number().int().positive(),
	message: z.string(),
});

export const cartMutationOutputSchema = z.object({
	cart: cartSnapshotSchema,
	warnings: z.array(cartWarningSchema),
});
