import type { Prisma } from "~/prisma/client";
import { qaTicketStatusSchema } from "~/schemas/admin/qa-ticket.schemas";
import type {
	QaTicketCreateInput,
	QaTicketListInput,
	QaTicketSetStatusInput,
	QaTicketStatus,
	QaTicketUpdateInput,
} from "~/shared/common/admin-crud/qa-ticket.types";

type AdminDbClient = Prisma.TransactionClient;

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
	notes: true,
	assignee: assigneeSelect,
	deleted: true,
	updatedAt: true,
} satisfies Prisma.QaTicketSelect;

export const qaTicketDetailSelect = {
	...qaTicketListSelect,
	steps: true,
	expectedResult: true,
} satisfies Prisma.QaTicketSelect;

export type QaTicketListRecord = Prisma.QaTicketGetPayload<{
	select: typeof qaTicketListSelect;
}>;

export type QaTicketDetailRecord = Prisma.QaTicketGetPayload<{
	select: typeof qaTicketDetailSelect;
}>;

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

export async function findQaTicketById(db: AdminDbClient, id: number) {
	return db.qaTicket.findUnique({
		where: { id },
		select: qaTicketDetailSelect,
	});
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

	// groupBy emits no row for a status nobody is in, so the six keys start at
	// zero: the stats contract has one non-optional counter per enum value.
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
		select: qaTicketDetailSelect,
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
		select: qaTicketDetailSelect,
	});
}

export async function setQaTicketStatus(
	db: AdminDbClient,
	input: QaTicketSetStatusInput,
) {
	return db.qaTicket.update({
		where: { id: input.id },
		data: {
			status: input.status,
			notes: input.notes ?? null,
		},
		select: qaTicketDetailSelect,
	});
}

export async function claimQaTicket(
	db: AdminDbClient,
	id: number,
	assigneeId: string,
) {
	return db.qaTicket.update({
		where: { id },
		data: {
			assigneeId,
			status: "inProgress",
		},
		select: qaTicketDetailSelect,
	});
}

export async function softDeleteQaTicket(db: AdminDbClient, id: number) {
	return db.qaTicket.update({
		where: { id },
		data: { deleted: true },
		select: qaTicketDetailSelect,
	});
}

export async function hardDeleteQaTicket(db: AdminDbClient, id: number) {
	return db.qaTicket.delete({
		where: { id },
		select: { id: true },
	});
}
