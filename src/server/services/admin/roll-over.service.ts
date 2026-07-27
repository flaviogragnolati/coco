import { Prisma } from "~/prisma/client";
import {
	rollOverListOutputSchema,
	rollOverResolveOutputSchema,
	rollOverStatsSchema,
} from "~/schemas/admin/roll-over.schemas";
import type { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { writeAdminAuditLog } from "~/server/services/admin/_base/admin-audit";
import type {
	RollOverListInput,
	RollOverListItem,
	RollOverListOutput,
	RollOverResolveInput,
	RollOverResolveOutput,
	RollOverStats,
	RollOverStatus,
} from "~/shared/common/admin-crud/roll-over.types";
import { throwConflict, throwNotFound } from "./_base/admin-crud.errors";
import { AdminOperationsSideEffects } from "./operations-effects/operations-side-effects.service";
import {
	countRollOverCandidates,
	findRollOverForCommand,
	getRollOverStats,
	listRollOverCandidates,
	type RollOverSummaryRecord,
	updateRollOverStatus,
} from "./roll-over.data";

type AdminDb = typeof db;

const ROLL_OVER_ENTITY = "roll_over";
const sideEffects = new AdminOperationsSideEffects();

const rollOverStatuses: RollOverStatus[] = [
	"open",
	"rebatched",
	"resolved",
	"cancelled",
];

function summarizeRollOver(record: RollOverSummaryRecord): RollOverListItem {
	return {
		id: record.id,
		stage: record.stage,
		status: record.status,
		quantity: record.quantity.toString(),
		reason: record.reason,
		operation: record.operation,
		rebatchedIntoOperation: record.rebatchedIntoOperation,
		cartItem: {
			id: record.cartItem.id,
			code: record.cartItem.code,
			userName: record.cartItem.cart.user.name,
		},
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

/**
 * Roll overs have no diagnostics of their own — they are the *output* of the
 * rules that do — so this is a plain paginated list without the
 * `diagnosticState` scan the other entities need.
 */
export async function list(
	input: RollOverListInput,
	database: AdminDb,
): Promise<RollOverListOutput> {
	const [total, records] = await Promise.all([
		countRollOverCandidates(database, input),
		listRollOverCandidates(database, input, {
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
		}),
	]);

	return rollOverListOutputSchema.parse({
		items: records.map(summarizeRollOver),
		page: input.page,
		pageSize: input.pageSize,
		total,
		pageCount: total === 0 ? 0 : Math.ceil(total / input.pageSize),
		truncated: false,
	});
}

export async function getStats(database: AdminDb): Promise<RollOverStats> {
	const stats = await getRollOverStats(database);
	const byStatusCounts = new Map(
		stats.byStatus.map((row) => [row.status, row._count._all]),
	);

	return rollOverStatsSchema.parse({
		total: stats.total,
		byStatus: Object.fromEntries(
			rollOverStatuses.map((status) => [
				status,
				byStatusCounts.get(status) ?? 0,
			]),
		),
		openQuantity: (stats.openQuantity ?? new Prisma.Decimal(0)).toString(),
	});
}

/**
 * Close an open roll over with an explicit decision. Records the decision and
 * moves no money; ADR 0005 makes `cancelled` cascade-only, so there is
 * deliberately no cancel command here.
 */
export async function resolve(
	input: RollOverResolveInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<RollOverResolveOutput> {
	const result = await database.$transaction(async (tx) => {
		const record = await findRollOverForCommand(tx, input.id);
		if (!record) throwNotFound("Rollover");

		if (record.status !== "open") {
			throwConflict("Solo se puede resolver un rollover abierto");
		}

		await updateRollOverStatus(tx, record.id, "resolved");

		// No counter recompute: `rollOverQuantity` counts every non-cancelled roll
		// over, so resolving one does not move it.
		const effects = await sideEffects.onRollOverResolved(
			{ db: tx, actor, source: "rollOver" },
			{
				rollOverId: record.id,
				operationId: record.operationId,
				cartItemId: record.cartItemId,
				cartId: record.cartItem.cartId,
				quantity: record.quantity.toString(),
				reason: input.reason,
			},
		);

		await writeAdminAuditLog(tx, {
			action: "rollOver.resolve",
			actor,
			entityType: ROLL_OVER_ENTITY,
			entityId: String(record.id),
			before: { id: record.id, status: record.status },
			after: { id: record.id, status: "resolved" },
			metadata: { effects, reason: input.reason },
		});

		return rollOverResolveOutputSchema.parse({
			id: record.id,
			operationId: record.operationId,
			status: "resolved",
		});
	});

	await DomainEventDispatcher.wake();
	return result;
}
