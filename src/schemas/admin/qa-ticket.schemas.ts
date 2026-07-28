import { z } from "zod";

import { nullishText, requiredText } from "./_crud-schema-helpers";

const optionalAssigneeId = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value && value.length > 0 ? value : undefined));

export const qaTicketIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const qaTicketStatusSchema = z.enum([
	"pending",
	"inProgress",
	"passed",
	"failed",
	"blocked",
	"skipped",
]);

export const qaTicketCreateInputSchema = z.object({
	section: requiredText("La sección es obligatoria"),
	title: requiredText("El título es obligatorio"),
	actor: requiredText("El rol que ejecuta es obligatorio"),
	feature: requiredText("La feature es obligatoria"),
	steps: requiredText("El flujo es obligatorio"),
	expectedResult: requiredText("El resultado esperado es obligatorio"),
	status: qaTicketStatusSchema.default("pending"),
	isRegressionPath: z.boolean().default(false),
	notes: nullishText,
	assigneeId: optionalAssigneeId,
});

export const qaTicketUpdateInputSchema = qaTicketCreateInputSchema.extend({
	id: qaTicketIdSchema,
});

export const qaTicketDeleteInputSchema = z.object({
	id: qaTicketIdSchema,
});

export const qaTicketSetStatusInputSchema = z.object({
	id: qaTicketIdSchema,
	status: qaTicketStatusSchema,
	notes: nullishText,
});

export const qaTicketClaimInputSchema = z.object({
	id: qaTicketIdSchema,
});

export const qaTicketListInputSchema = z.object({
	includeDeleted: z.boolean().optional().default(false),
});

const qaTicketAssigneeSchema = z
	.object({
		id: z.string(),
		name: z.string(),
	})
	.nullable();

export const qaTicketListItemSchema = z.object({
	id: qaTicketIdSchema,
	code: z.number().int(),
	section: z.string(),
	title: z.string(),
	actor: z.string(),
	feature: z.string(),
	status: qaTicketStatusSchema,
	isRegressionPath: z.boolean(),
	notes: z.string().nullable(),
	assignee: qaTicketAssigneeSchema,
	deleted: z.boolean(),
	updatedAt: z.date(),
});

export const qaTicketDetailSchema = qaTicketListItemSchema.extend({
	steps: z.string(),
	expectedResult: z.string(),
});

export const qaTicketStatsSchema = z.object({
	total: z.number().int().nonnegative(),
	pending: z.number().int().nonnegative(),
	inProgress: z.number().int().nonnegative(),
	passed: z.number().int().nonnegative(),
	failed: z.number().int().nonnegative(),
	blocked: z.number().int().nonnegative(),
	skipped: z.number().int().nonnegative(),
	deleted: z.number().int().nonnegative(),
});

export const qaTicketListOutputSchema = z.array(qaTicketListItemSchema);
