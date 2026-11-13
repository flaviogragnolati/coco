import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import { catalogCurrencySchema } from "~/schemas/catalog.schemas";

export const repeatOrderPreviewInputSchema = z.object({
	orderId: z.number().int().positive(),
});

export const repeatOrderPreviewLineSchema = z.object({
	productId: z.number().int().positive().nullable(),
	name: z.string(),
	available: z.boolean(),
	quantity: decimalOutputSchema,
	quantityLabel: z.string(),
	lineTotal: decimalOutputSchema.nullable(),
	currency: catalogCurrencySchema.nullable(),
});

export const repeatOrderPreviewSchema = z.discriminatedUnion("state", [
	z.object({
		state: z.literal("blocked"),
		waitingOrder: z.object({
			id: z.number().int().positive(),
			code: z.string(),
			totalAmount: decimalOutputSchema,
			currency: catalogCurrencySchema.nullable(),
		}),
	}),
	z.object({
		state: z.literal("ready"),
		lines: z.array(repeatOrderPreviewLineSchema),
	}),
]);

export const repeatOrderInputSchema = z.object({
	orderId: z.number().int().positive(),
	productIds: z.array(z.number().int().positive()).min(1).max(200),
});
