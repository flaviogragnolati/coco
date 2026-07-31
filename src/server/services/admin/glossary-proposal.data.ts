import type { Prisma } from "~/prisma/client";
import type {
	GlossaryProposalCreateInput,
	GlossaryProposalListInput,
	GlossaryProposalResolveInput,
} from "~/shared/common/admin-crud/glossary-proposal.types";

type AdminDbClient = Prisma.TransactionClient;

const proposalUserSelect = {
	select: { id: true, name: true },
} satisfies Prisma.GlossaryProposal$proposerArgs;

/**
 * One select for both list and detail: a proposal is small enough to render
 * whole in its card, so there is nothing a detail view would add.
 */
export const glossaryProposalListSelect = {
	id: true,
	entrySlug: true,
	entryLabel: true,
	field: true,
	currentValue: true,
	proposed: true,
	reason: true,
	status: true,
	proposer: proposalUserSelect,
	resolver: proposalUserSelect,
	resolutionNote: true,
	resolvedAt: true,
	createdAt: true,
} satisfies Prisma.GlossaryProposalSelect;

export type GlossaryProposalRecord = Prisma.GlossaryProposalGetPayload<{
	select: typeof glossaryProposalListSelect;
}>;

export async function listGlossaryProposals(
	db: AdminDbClient,
	input: GlossaryProposalListInput,
) {
	return db.glossaryProposal.findMany({
		where: {
			status: input.status === "all" ? undefined : input.status,
			entrySlug: input.entrySlug || undefined,
		},
		select: glossaryProposalListSelect,
		// Enum declaration order puts `open` first, so what still needs a decision
		// leads the list.
		orderBy: [{ status: "asc" }, { createdAt: "desc" }],
	});
}

export async function findGlossaryProposalById(db: AdminDbClient, id: number) {
	return db.glossaryProposal.findUnique({
		where: { id },
		select: glossaryProposalListSelect,
	});
}

export async function createGlossaryProposal(
	db: AdminDbClient,
	input: GlossaryProposalCreateInput,
	proposerId: string,
) {
	return db.glossaryProposal.create({
		data: {
			entrySlug: input.entrySlug,
			entryLabel: input.entryLabel,
			field: input.field,
			currentValue: input.currentValue ?? null,
			proposed: input.proposed,
			reason: input.reason ?? null,
			proposerId,
		},
		select: glossaryProposalListSelect,
	});
}

export async function resolveGlossaryProposal(
	db: AdminDbClient,
	input: GlossaryProposalResolveInput,
	resolverId: string,
) {
	return db.glossaryProposal.update({
		where: { id: input.id },
		data: {
			status: input.status,
			resolverId,
			resolutionNote: input.resolutionNote ?? null,
			resolvedAt: new Date(),
		},
		select: glossaryProposalListSelect,
	});
}
