import type { z } from "zod";

import type {
	glossaryProposalCreateInputSchema,
	glossaryProposalFieldSchema,
	glossaryProposalListInputSchema,
	glossaryProposalListItemSchema,
	glossaryProposalResolutionSchema,
	glossaryProposalResolveInputSchema,
	glossaryProposalStatusSchema,
} from "~/schemas/admin/glossary-proposal.schemas";

export type GlossaryProposalField = z.output<
	typeof glossaryProposalFieldSchema
>;
export type GlossaryProposalStatus = z.output<
	typeof glossaryProposalStatusSchema
>;
export type GlossaryProposalResolution = z.output<
	typeof glossaryProposalResolutionSchema
>;
export type GlossaryProposalListInput = z.output<
	typeof glossaryProposalListInputSchema
>;
export type GlossaryProposalListItem = z.output<
	typeof glossaryProposalListItemSchema
>;
export type GlossaryProposalCreateInput = z.output<
	typeof glossaryProposalCreateInputSchema
>;
export type GlossaryProposalResolveInput = z.output<
	typeof glossaryProposalResolveInputSchema
>;
export type GlossaryProposalFormInput = z.input<
	typeof glossaryProposalCreateInputSchema
>;
