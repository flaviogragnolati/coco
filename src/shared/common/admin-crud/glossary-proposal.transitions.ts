/**
 * The legal moves of a glossary proposal, shared by the service (which rejects
 * the rest) and the tab (which only renders buttons for these). Kept in one
 * module because two copies drift, and the drift shows up as a button that
 * always fails.
 *
 * `accepted → applied` is the manual gap ADR 0007 accepts: someone edits the
 * dataset, `CONTEXT.md` and the label map, then records that it happened.
 */

import type {
	GlossaryProposalResolution,
	GlossaryProposalStatus,
} from "./glossary-proposal.types";

export const glossaryProposalTransitions: Record<
	GlossaryProposalStatus,
	readonly GlossaryProposalResolution[]
> = {
	open: ["accepted", "rejected"],
	accepted: ["applied", "rejected"],
	applied: [],
	rejected: [],
};

export function canResolveGlossaryProposal(
	from: GlossaryProposalStatus,
	to: GlossaryProposalResolution,
) {
	return glossaryProposalTransitions[from].includes(to);
}
