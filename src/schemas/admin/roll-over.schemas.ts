import { z } from "zod";
import { decimalOutputSchema } from "~/schemas/_schema-helpers";
import {
	dateInputSchema,
	requiredText,
	sortDirectionSchema,
} from "~/schemas/admin/_crud-schema-helpers";

const positiveIdSchema = z.number().int().positive();

const optionalTrimmedText = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined));

export const rollOverStatusSchema = z.enum([
	"open",
	"rebatched",
	"resolved",
	"cancelled",
]);

export const rollOverStageSchema = z.enum(["preAllocation", "postAllocation"]);

export const rollOverResolveInputSchema = z.object({
	id: positiveIdSchema,
	reason: requiredText("El motivo es obligatorio"),
});

export const rollOverResolveOutputSchema = z.object({
	id: positiveIdSchema,
	operationId: positiveIdSchema,
	status: rollOverStatusSchema,
});

/**
 * `status` is deliberately unfiltered by default: a resolved roll over settles
 * demand terminally (ADR 0005), so surfacing them is the point of this page —
 * before it existed they were visible only inside their owning operation.
 */
export const rollOverListInputSchema = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().min(1).max(100).default(25),
	sortDirection: sortDirectionSchema,
	search: optionalTrimmedText,
	status: rollOverStatusSchema.optional(),
	stage: rollOverStageSchema.optional(),
	operationId: positiveIdSchema.optional(),
	cartItemId: positiveIdSchema.optional(),
	createdFrom: dateInputSchema.optional(),
	createdTo: dateInputSchema.optional(),
});

export const rollOverListItemSchema = z.object({
	id: positiveIdSchema,
	stage: rollOverStageSchema,
	status: rollOverStatusSchema,
	quantity: decimalOutputSchema,
	reason: z.string(),
	operation: z.object({
		id: positiveIdSchema,
		code: z.string(),
		status: z.string(),
	}),
	rebatchedIntoOperation: z
		.object({ id: positiveIdSchema, code: z.string() })
		.nullable(),
	cartItem: z.object({
		id: positiveIdSchema,
		code: z.string(),
		userName: z.string(),
	}),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const rollOverListOutputSchema = z.object({
	items: z.array(rollOverListItemSchema),
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	pageCount: z.number().int().nonnegative(),
	truncated: z.boolean(),
});

export const rollOverStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	byStatus: z.record(rollOverStatusSchema, z.number().int().nonnegative()),
	openQuantity: decimalOutputSchema,
});
