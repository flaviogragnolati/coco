import type { Prisma } from "~/prisma/client";
import { qaTicketStatusSchema } from "~/schemas/admin/qa-ticket.schemas";
import type {
	QaTicketCreateInput,
	QaTicketListInput,
	QaTicketLogInput,
	QaTicketStatus,
	QaTicketUpdateInput,
} from "~/shared/common/admin-crud/qa-ticket.types";

type AdminDbClient = Prisma.TransactionClient;
type QaTicketLogKind = "consoleLog" | "networkLog";

const assigneeSelect = {
	select: { id: true, name: true },
} satisfies Prisma.QaTicket$assigneeArgs;

export const qaTicketListSelect = {
	id: true,
	code: true,
	section: true,
	title: true,
	actor: true,
	feature: true,
	status: true,
	isRegressionPath: true,
	assignee: assigneeSelect,
	deleted: true,
	updatedAt: true,
} satisfies Prisma.QaTicketSelect;

const qaTicketCoreDetailSelect = {
	...qaTicketListSelect,
	steps: true,
	expectedResult: true,
	notes: true,
} satisfies Prisma.QaTicketSelect;

export const qaTicketEvidenceMetadataSelect = {
	id: true,
	kind: true,
	slot: true,
	fileName: true,
	mimeType: true,
	byteSize: true,
	createdAt: true,
	updatedAt: true,
} satisfies Prisma.QaTicketEvidenceSelect;

const qaTicketLogSelect = {
	...qaTicketEvidenceMetadataSelect,
	content: true,
} satisfies Prisma.QaTicketEvidenceSelect;

const qaTicketImageContentSelect = {
	...qaTicketEvidenceMetadataSelect,
	content: true,
	qaTicket: { select: { deleted: true, assignee: assigneeSelect } },
} satisfies Prisma.QaTicketEvidenceSelect;

export type QaTicketListRecord = Prisma.QaTicketGetPayload<{
	select: typeof qaTicketListSelect;
}>;

type QaTicketCoreDetailRecord = Prisma.QaTicketGetPayload<{
	select: typeof qaTicketCoreDetailSelect;
}>;

type QaTicketLogRecord = Prisma.QaTicketEvidenceGetPayload<{
	select: typeof qaTicketLogSelect;
}>;

export type QaTicketEvidenceMetadataRecord = Prisma.QaTicketEvidenceGetPayload<{
	select: typeof qaTicketEvidenceMetadataSelect;
}>;

export type QaTicketImageContentRecord = Prisma.QaTicketEvidenceGetPayload<{
	select: typeof qaTicketImageContentSelect;
}>;

export type QaTicketDetailRecord = QaTicketCoreDetailRecord & {
	consoleLog: QaTicketLogRecord | null;
	networkLog: QaTicketLogRecord | null;
	images: QaTicketEvidenceMetadataRecord[];
};

export async function listQaTickets(
	db: AdminDbClient,
	input: QaTicketListInput,
) {
	return db.qaTicket.findMany({
		where: input.includeDeleted ? undefined : { deleted: false },
		select: qaTicketListSelect,
		orderBy: [{ deleted: "asc" }, { code: "asc" }],
	});
}

export async function findQaTicketById(
	db: AdminDbClient,
	id: number,
): Promise<QaTicketDetailRecord | null> {
	const ticket = await db.qaTicket.findUnique({
		where: { id },
		select: qaTicketCoreDetailSelect,
	});
	if (!ticket) return null;

	const logs = await db.qaTicketEvidence.findMany({
		where: { qaTicketId: id, kind: { in: ["consoleLog", "networkLog"] } },
		select: qaTicketLogSelect,
	});
	const images = await db.qaTicketEvidence.findMany({
		where: { qaTicketId: id, kind: "image" },
		select: qaTicketEvidenceMetadataSelect,
		orderBy: { slot: "asc" },
	});

	return {
		...ticket,
		consoleLog: logs.find((evidence) => evidence.kind === "consoleLog") ?? null,
		networkLog: logs.find((evidence) => evidence.kind === "networkLog") ?? null,
		images,
	};
}

export async function getQaTicketStats(db: AdminDbClient) {
	const [total, deleted, byStatus] = await Promise.all([
		db.qaTicket.count(),
		db.qaTicket.count({ where: { deleted: true } }),
		db.qaTicket.groupBy({
			by: ["status"],
			where: { deleted: false },
			_count: true,
		}),
	]);

	// Prisma omits statuses with no rows; initialize every contract key first.
	const counters = Object.fromEntries(
		qaTicketStatusSchema.options.map((status) => [status, 0]),
	) as Record<QaTicketStatus, number>;

	for (const row of byStatus) counters[row.status] = row._count;

	return { total, deleted, ...counters };
}

export async function getNextQaTicketCode(db: AdminDbClient) {
	const aggregate = await db.qaTicket.aggregate({ _max: { code: true } });
	return (aggregate._max.code ?? 0) + 1;
}

export async function createQaTicket(
	db: AdminDbClient,
	input: QaTicketCreateInput,
	code: number,
) {
	return db.qaTicket.create({
		data: {
			code,
			section: input.section,
			title: input.title,
			actor: input.actor,
			feature: input.feature,
			steps: input.steps,
			expectedResult: input.expectedResult,
			status: input.status,
			isRegressionPath: input.isRegressionPath,
			notes: input.notes ?? null,
			assigneeId: input.assigneeId ?? null,
			deleted: false,
		},
		select: { id: true },
	});
}

export async function updateQaTicket(
	db: AdminDbClient,
	input: QaTicketUpdateInput,
) {
	return db.qaTicket.update({
		where: { id: input.id },
		data: {
			section: input.section,
			title: input.title,
			actor: input.actor,
			feature: input.feature,
			steps: input.steps,
			expectedResult: input.expectedResult,
			status: input.status,
			isRegressionPath: input.isRegressionPath,
			notes: input.notes ?? null,
			assigneeId: input.assigneeId ?? null,
		},
		select: { id: true },
	});
}

export async function saveQaTicketResult(
	db: AdminDbClient,
	id: number,
	assigneeId: string,
	status: QaTicketStatus,
	notes: string | null,
) {
	return db.qaTicket.updateMany({
		where: { id, assigneeId, deleted: false },
		data: { status, notes },
	});
}

export async function replaceQaTicketLog(
	db: AdminDbClient,
	qaTicketId: number,
	kind: QaTicketLogKind,
	input: QaTicketLogInput & { byteSize: number },
) {
	if (input.content.length === 0) {
		await db.qaTicketEvidence.deleteMany({
			where: { qaTicketId, kind, slot: 0 },
		});
		return;
	}

	await db.qaTicketEvidence.upsert({
		where: { qaTicketId_kind_slot: { qaTicketId, kind, slot: 0 } },
		create: {
			qaTicketId,
			kind,
			slot: 0,
			content: input.content,
			fileName: input.fileName,
			mimeType: input.mimeType,
			byteSize: input.byteSize,
		},
		update: {
			content: input.content,
			fileName: input.fileName,
			mimeType: input.mimeType,
			byteSize: input.byteSize,
		},
		select: { id: true },
	});
}

export async function claimQaTicket(
	db: AdminDbClient,
	id: number,
	assigneeId: string,
) {
	const result = await db.qaTicket.updateMany({
		where: {
			id,
			deleted: false,
			OR: [{ assigneeId: null }, { assigneeId }],
		},
		data: { assigneeId, status: "inProgress" },
	});

	return result.count === 1 ? findQaTicketById(db, id) : null;
}

export async function listQaTicketImageSlots(
	db: AdminDbClient,
	qaTicketId: number,
) {
	return db.qaTicketEvidence.findMany({
		where: { qaTicketId, kind: "image" },
		select: { slot: true },
		orderBy: { slot: "asc" },
	});
}

export async function createQaTicketImage(
	db: AdminDbClient,
	input: {
		qaTicketId: number;
		slot: number;
		content: string;
		fileName: string;
		mimeType: string;
		byteSize: number;
	},
) {
	return db.qaTicketEvidence.create({
		data: { ...input, kind: "image" },
		select: qaTicketEvidenceMetadataSelect,
	});
}

export async function findQaTicketImageById(db: AdminDbClient, id: number) {
	return db.qaTicketEvidence.findUnique({
		where: { id },
		select: qaTicketImageContentSelect,
	});
}

export async function deleteQaTicketImage(db: AdminDbClient, id: number) {
	return db.qaTicketEvidence.delete({
		where: { id },
		select: qaTicketEvidenceMetadataSelect,
	});
}

export async function softDeleteQaTicket(db: AdminDbClient, id: number) {
	return db.qaTicket.update({
		where: { id },
		data: { deleted: true },
		select: { id: true },
	});
}

export async function hardDeleteQaTicket(db: AdminDbClient, id: number) {
	return db.qaTicket.delete({
		where: { id },
		select: { id: true },
	});
}
