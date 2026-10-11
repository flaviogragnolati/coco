import { z } from "zod";

const positiveId = z.number().int().positive();
const moneyString = z.string().regex(/^\d+\.\d{2}$/);

/** One product's pending edit, as the preview showed it and the apply re-checks it. */
export const priceSheetChangeSchema = z.object({
	productId: positiveId,
	termsId: positiveId.nullable(),
	price: z.object({ from: moneyString.nullable(), to: moneyString }).nullable(),
	category: z
		.object({ from: positiveId.nullable(), to: positiveId })
		.nullable(),
});

export const priceSheetExpectedChangesSchema = z
	.array(priceSheetChangeSchema)
	.max(5000);

const categoryReferenceSchema = z.object({ id: positiveId, name: z.string() });

export const priceSheetPreviewRowSchema = z.object({
	rowNumber: z.number().int().positive(),
	productId: positiveId.nullable(),
	productName: z.string().nullable(),
	unitLabel: z.string().nullable(),
	currency: z.string().nullable(),
	price: z
		.object({
			current: moneyString.nullable(),
			next: moneyString,
			variationPercent: z.number().nullable(),
		})
		.nullable(),
	category: z
		.object({
			current: categoryReferenceSchema.nullable(),
			next: categoryReferenceSchema,
		})
		.nullable(),
	largeVariation: z.boolean(),
	errors: z.array(z.string()),
});

export const priceSheetPreviewSchema = z.object({
	rows: z.array(priceSheetPreviewRowSchema),
	changes: priceSheetExpectedChangesSchema,
	unchangedCount: z.number().int().nonnegative(),
	errorCount: z.number().int().nonnegative(),
	largeVariationCount: z.number().int().nonnegative(),
	canApply: z.boolean(),
});

export const priceSheetApplyResultSchema = z.object({
	priceCount: z.number().int().nonnegative(),
	categoryCount: z.number().int().nonnegative(),
});
