import {
	glossaryProposalListItemSchema,
	glossaryProposalListOutputSchema,
} from "~/schemas/admin/glossary-proposal.schemas";
import type { db } from "~/server/db";
import { canResolveGlossaryProposal } from "~/shared/common/admin-crud/glossary-proposal.transitions";
import type {
	GlossaryProposalCreateInput,
	GlossaryProposalListInput,
	GlossaryProposalListItem,
	GlossaryProposalResolveInput,
} from "~/shared/common/admin-crud/glossary-proposal.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	createGlossaryProposal,
	findGlossaryProposalById,
	type GlossaryProposalRecord,
	listGlossaryProposals,
	resolveGlossaryProposal,
} from "./glossary-proposal.data";

type AdminDb = typeof db;

const GLOSSARY_PROPOSAL_ENTITY = "glossaryProposal";

function parseProposal(
	record: GlossaryProposalRecord,
): GlossaryProposalListItem {
	return glossaryProposalListItemSchema.parse(record);
}

export async function list(
	input: GlossaryProposalListInput,
	database: AdminDb,
) {
	const records = await listGlossaryProposals(database, input);
	return glossaryProposalListOutputSchema.parse(records);
}

export async function create(
	input: GlossaryProposalCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		// The author comes from the session, never from the input: accepting a
		// client-supplied id would let anyone file a proposal under someone else.
		const after = parseProposal(
			await createGlossaryProposal(tx, input, actor.id),
		);

		await writeAdminAuditLog(tx, {
			action: "glossaryProposal.create",
			actor,
			entityType: GLOSSARY_PROPOSAL_ENTITY,
			entityId: String(after.id),
			after,
		});

		return after;
	});
}

export async function resolve(
	input: GlossaryProposalResolveInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const record = await findGlossaryProposalById(tx, input.id);
		if (!record) throwNotFound("Propuesta de glosario");

		const before = parseProposal(record);
		if (!canResolveGlossaryProposal(before.status, input.status)) {
			throw new AdminCrudError(
				"CONFLICT",
				`Una propuesta ${before.status} no puede pasar a ${input.status}`,
			);
		}

		const after = parseProposal(
			await resolveGlossaryProposal(tx, input, actor.id),
		);

		await writeAdminAuditLog(tx, {
			action: "glossaryProposal.resolve",
			actor,
			entityType: GLOSSARY_PROPOSAL_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}
