import { Prisma } from "~/prisma/client";
import {
	qaTicketDetailSchema,
	qaTicketEvidenceMetadataSchema,
	qaTicketListOutputSchema,
	qaTicketStatsSchema,
} from "~/schemas/admin/qa-ticket.schemas";
import type { db } from "~/server/db";
import type {
	QaTicketClaimInput,
	QaTicketCreateInput,
	QaTicketDeleteInput,
	QaTicketDetail,
	QaTicketEvidenceMetadata,
	QaTicketListInput,
	QaTicketSaveResultInput,
	QaTicketStats,
	QaTicketUpdateInput,
} from "~/shared/common/admin-crud/qa-ticket.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { AdminCrudError, throwNotFound } from "./_base/admin-crud.errors";
import {
	claimQaTicket,
	createQaTicket,
	createQaTicketImage,
	deleteQaTicketImage,
	findQaTicketById,
	findQaTicketImageById,
	getNextQaTicketCode,
	getQaTicketStats,
	hardDeleteQaTicket,
	listQaTicketImageSlots,
	listQaTickets,
	replaceQaTicketLog,
	saveQaTicketResult,
	softDeleteQaTicket,
	updateQaTicket,
} from "./qa-ticket.data";
import {
	decodeEvidenceBase64,
	nextAvailableImageSlot,
	validateImageEvidence,
	validateLogEvidence,
} from "./qa-ticket-evidence.validation";

type AdminDb = typeof db;

const QA_TICKET_ENTITY = "qaTicket";
const QA_TICKET_EVIDENCE_ENTITY = "qaTicketEvidence";

function parseDetail(
	record: NonNullable<Awaited<ReturnType<typeof findQaTicketById>>>,
) {
	return qaTicketDetailSchema.parse(record);
}

async function getRequiredDetail(
	dbClient: Prisma.TransactionClient,
	id: number,
) {
	const record = await findQaTicketById(dbClient, id);
	if (!record) throwNotFound("Ticket de QA");
	return parseDetail(record);
}

async function loadLiveTicket(tx: Prisma.TransactionClient, id: number) {
	const ticket = await getRequiredDetail(tx, id);
	if (ticket.deleted) {
		throw new AdminCrudError(
			"CONFLICT",
			"No se puede modificar un ticket de QA eliminado",
		);
	}
	return ticket;
}

function assertTicketOwner(ticket: QaTicketDetail, actor: AdminMutationActor) {
	if (!ticket.assignee) {
		throw new AdminCrudError(
			"CONFLICT",
			"Tomá el caso antes de guardar resultados o evidencias",
		);
	}
	if (ticket.assignee.id !== actor.id) {
		throw new AdminCrudError(
			"CONFLICT",
			`El caso está asignado a ${ticket.assignee.name}`,
		);
	}
}

function evidenceMetadataSnapshot(metadata: QaTicketEvidenceMetadata) {
	return {
		id: metadata.id,
		kind: metadata.kind,
		slot: metadata.slot,
		fileName: metadata.fileName,
		mimeType: metadata.mimeType,
		byteSize: metadata.byteSize,
		createdAt: metadata.createdAt,
		updatedAt: metadata.updatedAt,
	};
}

function auditSnapshot(ticket: QaTicketDetail) {
	const { consoleLog, networkLog, images, ...tracking } = ticket;
	return {
		...tracking,
		evidence: {
			images: images.map(evidenceMetadataSnapshot),
			consoleLog: consoleLog
				? {
						...evidenceMetadataSnapshot(consoleLog),
						contentLength: consoleLog.content.length,
					}
				: null,
			networkLog: networkLog
				? {
						...evidenceMetadataSnapshot(networkLog),
						contentLength: networkLog.content.length,
					}
				: null,
		},
	};
}

export async function list(input: QaTicketListInput, database: AdminDb) {
	return qaTicketListOutputSchema.parse(await listQaTickets(database, input));
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
		const created = await createQaTicket(tx, input, code);
		const after = await getRequiredDetail(tx, created.id);

		await writeAdminAuditLog(tx, {
			action: "qaTicket.create",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(after.id),
			after: auditSnapshot(after),
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
		await updateQaTicket(tx, input);
		const after = await getRequiredDetail(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "qaTicket.update",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(after.id),
			before: auditSnapshot(before),
			after: auditSnapshot(after),
		});

		return after;
	});
}

export async function saveResult(
	input: QaTicketSaveResultInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	const consoleLog = validateLogEvidence("consoleLog", input.consoleLog);
	const networkLog = validateLogEvidence("networkLog", input.networkLog);

	return database.$transaction(async (tx) => {
		const before = await loadLiveTicket(tx, input.id);
		assertTicketOwner(before, actor);

		const result = await saveQaTicketResult(
			tx,
			input.id,
			actor.id,
			input.status,
			input.notes ?? null,
		);
		if (result.count !== 1) {
			throw new AdminCrudError(
				"CONFLICT",
				"La asignación cambió mientras guardabas el resultado",
			);
		}
		await replaceQaTicketLog(tx, input.id, "consoleLog", consoleLog);
		await replaceQaTicketLog(tx, input.id, "networkLog", networkLog);
		const after = await getRequiredDetail(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "qaTicket.saveResult",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(after.id),
			before: auditSnapshot(before),
			after: auditSnapshot(after),
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
		if (before.assignee?.id === actor.id && before.status === "inProgress") {
			return before;
		}
		if (before.assignee && before.assignee.id !== actor.id) {
			throw new AdminCrudError(
				"CONFLICT",
				`El caso ya está asignado a ${before.assignee.name}`,
			);
		}

		const claimed = await claimQaTicket(tx, input.id, actor.id);
		if (!claimed) {
			const current = await loadLiveTicket(tx, input.id);
			throw new AdminCrudError(
				"CONFLICT",
				current.assignee
					? `El caso ya está asignado a ${current.assignee.name}`
					: "El caso cambió mientras intentabas tomarlo",
			);
		}
		const after = parseDetail(claimed);

		await writeAdminAuditLog(tx, {
			action: "qaTicket.claim",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(after.id),
			before: auditSnapshot(before),
			after: auditSnapshot(after),
		});

		return after;
	});
}

export async function addImageEvidence(
	input: {
		qaTicketId: number;
		bytes: Uint8Array;
		fileName?: string | null;
		mimeType?: string | null;
	},
	actor: AdminMutationActor,
	database: AdminDb,
) {
	const image = validateImageEvidence(input);

	try {
		return await database.$transaction(async (tx) => {
			const ticket = await loadLiveTicket(tx, input.qaTicketId);
			assertTicketOwner(ticket, actor);

			const slot = nextAvailableImageSlot(
				(await listQaTicketImageSlots(tx, input.qaTicketId)).map(
					(evidence) => evidence.slot,
				),
			);
			if (slot === undefined) {
				throw new AdminCrudError(
					"CONFLICT",
					"El ticket ya tiene el máximo de cinco imágenes",
				);
			}

			const created = qaTicketEvidenceMetadataSchema.parse(
				await createQaTicketImage(tx, {
					qaTicketId: input.qaTicketId,
					slot,
					...image,
				}),
			);

			await writeAdminAuditLog(tx, {
				action: "qaTicket.evidence.addImage",
				actor,
				entityType: QA_TICKET_EVIDENCE_ENTITY,
				entityId: String(created.id),
				after: evidenceMetadataSnapshot(created),
				metadata: { qaTicketId: input.qaTicketId },
			});

			return created;
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new AdminCrudError(
				"CONFLICT",
				"Otra carga ocupó el mismo lugar; reintentá la imagen",
			);
		}
		throw error;
	}
}

export async function getImageEvidence(id: number, database: AdminDb) {
	const evidence = await findQaTicketImageById(database, id);
	if (evidence?.kind !== "image") {
		throwNotFound("Evidencia de imagen");
	}
	const bytes = decodeEvidenceBase64(evidence.content, evidence.byteSize);
	const validated = validateImageEvidence({
		bytes,
		fileName: evidence.fileName,
		mimeType: evidence.mimeType,
	});

	return {
		bytes,
		fileName: validated.fileName,
		mimeType: validated.mimeType,
		byteSize: validated.byteSize,
	};
}

export async function removeImageEvidence(
	id: number,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const evidence = await findQaTicketImageById(tx, id);
		if (evidence?.kind !== "image") {
			throwNotFound("Evidencia de imagen");
		}
		if (evidence.qaTicket.deleted) {
			throw new AdminCrudError(
				"CONFLICT",
				"No se puede modificar la evidencia de un ticket eliminado",
			);
		}
		if (!evidence.qaTicket.assignee) {
			throw new AdminCrudError(
				"CONFLICT",
				"Tomá el caso antes de modificar sus evidencias",
			);
		}
		if (evidence.qaTicket.assignee.id !== actor.id) {
			throw new AdminCrudError(
				"CONFLICT",
				`El caso está asignado a ${evidence.qaTicket.assignee.name}`,
			);
		}

		const before = qaTicketEvidenceMetadataSchema.parse(evidence);
		await deleteQaTicketImage(tx, id);
		await writeAdminAuditLog(tx, {
			action: "qaTicket.evidence.removeImage",
			actor,
			entityType: QA_TICKET_EVIDENCE_ENTITY,
			entityId: String(id),
			before: evidenceMetadataSnapshot(before),
		});

		return { id };
	});
}

export async function softDelete(
	input: QaTicketDeleteInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const before = await getRequiredDetail(tx, input.id);
		await softDeleteQaTicket(tx, input.id);
		const after = await getRequiredDetail(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "qaTicket.softDelete",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(after.id),
			before: auditSnapshot(before),
			after: auditSnapshot(after),
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
		const before = await getRequiredDetail(tx, input.id);
		const deleted = await hardDeleteQaTicket(tx, input.id);

		await writeAdminAuditLog(tx, {
			action: "qaTicket.hardDelete",
			actor,
			entityType: QA_TICKET_ENTITY,
			entityId: String(deleted.id),
			before: auditSnapshot(before),
			metadata: {
				hardDelete: true,
				evidenceCount:
					before.images.length +
					Number(Boolean(before.consoleLog)) +
					Number(Boolean(before.networkLog)),
			},
		});

		return { id: deleted.id };
	});
}
