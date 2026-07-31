import { z } from "zod";

import { nullishText, requiredText } from "./_crud-schema-helpers";

export const glossaryProposalIdSchema = z
	.number()
	.int("El id debe ser un número entero")
	.positive("El id debe ser positivo");

export const glossaryProposalFieldSchema = z.enum([
	"label",
	"definition",
	"identifier",
]);

export const glossaryProposalStatusSchema = z.enum([
	"open",
	"accepted",
	"applied",
	"rejected",
]);

/** `open` is where a proposal starts, never somewhere it can be moved to. */
export const glossaryProposalResolutionSchema = z.enum([
	"accepted",
	"applied",
	"rejected",
]);

export const glossaryProposalCreateInputSchema = z.object({
	entrySlug: requiredText("El término es obligatorio"),
	entryLabel: requiredText("El nombre del término es obligatorio"),
	field: glossaryProposalFieldSchema,
	currentValue: nullishText,
	proposed: requiredText("La propuesta es obligatoria").max(
		2000,
		"La propuesta no puede superar los 2000 caracteres",
	),
	reason: nullishText,
});

export const glossaryProposalResolveInputSchema = z.object({
	id: glossaryProposalIdSchema,
	status: glossaryProposalResolutionSchema,
	resolutionNote: nullishText,
});

export const glossaryProposalListInputSchema = z.object({
	status: z
		.enum([...glossaryProposalStatusSchema.options, "all"])
		.optional()
		.default("all"),
	entrySlug: z.string().trim().optional(),
});

const glossaryProposalUserSchema = z
	.object({
		id: z.string(),
		name: z.string(),
	})
	.nullable();

export const glossaryProposalListItemSchema = z.object({
	id: glossaryProposalIdSchema,
	entrySlug: z.string(),
	entryLabel: z.string(),
	field: glossaryProposalFieldSchema,
	currentValue: z.string().nullable(),
	proposed: z.string(),
	reason: z.string().nullable(),
	status: glossaryProposalStatusSchema,
	proposer: glossaryProposalUserSchema,
	resolver: glossaryProposalUserSchema,
	resolutionNote: z.string().nullable(),
	resolvedAt: z.date().nullable(),
	createdAt: z.date(),
});

export const glossaryProposalListOutputSchema = z.array(
	glossaryProposalListItemSchema,
);
