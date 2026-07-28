import type { Prisma } from "~/prisma/client";
import {
	qaTicketDetailSchema,
	qaTicketListOutputSchema,
	qaTicketStatsSchema,
} from "~/schemas/admin/qa-ticket.schemas";
import type { db } from "~/server/db";
import type {
	QaTicketClaimInput,
	QaTicketCreateInput,
	QaTicketDeleteInput,
	QaTicketDetail,
	QaTicketListInput,
	QaTicketSetStatusInput,
	QaTicketStats,
	QaTicketUpdateInput,
} from "~/shared/common/admin-crud/qa-ticket.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	claimQaTicket,
	createQaTicket,
	findQaTicketById,
	getNextQaTicketCode,
	getQaTicketStats,
	hardDeleteQaTicket,
	listQaTickets,
	type QaTicketDetailRecord,
	setQaTicketStatus,
	softDeleteQaTicket,
	updateQaTicket,
} from "./qa-ticket.data";

type AdminDb = typeof db;

const QA_TICKET_ENTITY = "qaTicket";

function parseDetail(record: QaTicketDetailRecord): QaTicketDetail {
	return qaTicketDetailSchema.parse(record);
}

async function loadLiveTicket(tx: Prisma.TransactionClient, id: number) {
	const record = await findQaTicketById(tx, id);
	if (!record) throwNotFound("Ticket de QA");

	const before = parseDetail(record);
	if (before.deleted) {
		throw new AdminCrudError(
			"CONFLICT",
			"No se puede editar un ticket de QA eliminado",
		);
	}

	return before;
}

export async function list(input: QaTicketListInput, database: AdminDb) {
	const records = await listQaTickets(database, input);
	return qaTicketListOutputSchema.parse(records);
}

export async function getById(id: number, database: AdminDb) {
	const ticket = await findQaTicketById(database, id);
	if (!ticket) throwNotFound("Ticket de QA");
	return parseDetail(ticket);
}

export async function getStats(database: AdminDb): Promise<QaTicketStats> {
	return qaTicketStatsSchema.parse(await getQaTicketStats(database));
}

export async function create(
	input: QaTicketCreateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const code = await getNextQaTicketCode(tx);
		const ticket = await createQaTicket(tx, input, code);
		const after = parseDetail(ticket);

		await writeAdminAuditLog(tx, {
			action: "qaTicket.create",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(after.id),
			after,
		});

		return after;
	});
}

export async function update(
	input: QaTicketUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const before = await loadLiveTicket(tx, input.id);
		const after = parseDetail(await updateQaTicket(tx, input));

		await writeAdminAuditLog(tx, {
			action: "qaTicket.update",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function setStatus(
	input: QaTicketSetStatusInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const before = await loadLiveTicket(tx, input.id);
		const after = parseDetail(await setQaTicketStatus(tx, input));

		await writeAdminAuditLog(tx, {
			action: "qaTicket.setStatus",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function claim(
	input: QaTicketClaimInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const before = await loadLiveTicket(tx, input.id);
		const after = parseDetail(await claimQaTicket(tx, input.id, actor.id));

		await writeAdminAuditLog(tx, {
			action: "qaTicket.claim",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return after;
	});
}

export async function softDelete(
	input: QaTicketDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findQaTicketById(tx, input.id);
		if (!beforeRecord) throwNotFound("Ticket de QA");
		const before = parseDetail(beforeRecord);

		const after = parseDetail(await softDeleteQaTicket(tx, input.id));

		await writeAdminAuditLog(tx, {
			action: "qaTicket.softDelete",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(after.id),
			before,
			after,
		});

		return { id: after.id };
	});
}

export async function hardDelete(
	input: QaTicketDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const beforeRecord = await findQaTicketById(tx, input.id);
		if (!beforeRecord) throwNotFound("Ticket de QA");
		const before = parseDetail(beforeRecord);

		const deleted = await hardDeleteQaTicket(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "qaTicket.hardDelete",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(deleted.id),
			before,
			metadata: { hardDelete: true },
		});

		return { id: deleted.id };
	});
}
