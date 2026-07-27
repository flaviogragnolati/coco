import type { Prisma } from "~/prisma/client";
import type { RollOverListInput } from "~/shared/common/admin-crud/roll-over.types";
import { fromDateTimeLocalValue } from "~/shared/common/date.helpers";

type AdminDbClient = Prisma.TransactionClient;

const rollOverCommandSelect = {
	id: true,
	status: true,
	stage: true,
	quantity: true,
	reason: true,
	operationId: true,
	cartItemId: true,
	cartItem: {
		select: {
			id: true,
			code: true,
			cartId: true,
		},
	},
} satisfies Prisma.RollOverSelect;

export type RollOverCommandRecord = Prisma.RollOverGetPayload<{
	select: typeof rollOverCommandSelect;
}>;

export async function findRollOverForCommand(db: AdminDbClient, id: number) {
	return db.rollOver.findUnique({
		where: { id },
		select: rollOverCommandSelect,
	});
}

export async function updateRollOverStatus(
	db: AdminDbClient,
	id: number,
	status: Prisma.RollOverUpdateInput["status"],
) {
	await db.rollOver.update({ where: { id }, data: { status } });
}

export type PostAllocationRollOverInput = {
	cartItemId: number;
	operationId: number;
	quantity: Prisma.Decimal;
	reason: string;
};

/**
 * Bulk-create post-allocation roll overs. `createManyAndReturn` issues a single
 * INSERT ... RETURNING so rows come back in input order; `RollOver` has no
 * unique code, so that order is the only join and a length mismatch has to fail
 * loudly inside the transaction rather than mis-attribute a cart item.
 *
 * Three producers: the supplier loop (cut, cancellation), a receipt shortfall,
 * and a package write-off.
 */
export async function createPostAllocationRollOvers(
	db: AdminDbClient,
	rows: PostAllocationRollOverInput[],
) {
	if (rows.length === 0) return [];

	const created = await db.rollOver.createManyAndReturn({
		data: rows.map((row) => ({
			cartItemId: row.cartItemId,
			operationId: row.operationId,
			stage: "postAllocation" as const,
			status: "open" as const,
			quantity: row.quantity.toString(),
			reason: row.reason,
		})),
		select: { id: true, cartItemId: true, quantity: true },
	});

	if (created.length !== rows.length) {
		throw new Error(
			`Roll over bulk insert returned ${created.length} rows for ${rows.length} inputs`,
		);
	}

	return created.map((row, index) => ({
		id: row.id,
		cartItemId: row.cartItemId,
		quantity: row.quantity,
		reason: rows[index]?.reason ?? "",
	}));
}

const rollOverSummarySelect = {
	id: true,
	stage: true,
	status: true,
	quantity: true,
	reason: true,
	createdAt: true,
	updatedAt: true,
	operation: { select: { id: true, code: true, status: true } },
	rebatchedIntoOperation: { select: { id: true, code: true } },
	cartItem: {
		select: {
			id: true,
			code: true,
			cart: { select: { user: { select: { name: true } } } },
		},
	},
} satisfies Prisma.RollOverSelect;

export type RollOverSummaryRecord = Prisma.RollOverGetPayload<{
	select: typeof rollOverSummarySelect;
}>;

function buildRollOverWhere(
	input: RollOverListInput,
): Prisma.RollOverWhereInput {
	const and: Prisma.RollOverWhereInput[] = [];

	if (input.status !== undefined) and.push({ status: input.status });
	if (input.stage !== undefined) and.push({ stage: input.stage });
	if (input.operationId !== undefined) {
		and.push({ operationId: input.operationId });
	}
	if (input.cartItemId !== undefined)
		and.push({ cartItemId: input.cartItemId });
	if (input.createdFrom !== undefined) {
		and.push({ createdAt: { gte: fromDateTimeLocalValue(input.createdFrom) } });
	}
	if (input.createdTo !== undefined) {
		and.push({ createdAt: { lte: fromDateTimeLocalValue(input.createdTo) } });
	}
	if (input.search !== undefined) {
		and.push({
			OR: [
				{ reason: { contains: input.search } },
				{ operation: { code: { contains: input.search } } },
				{ cartItem: { code: { contains: input.search } } },
			],
		});
	}

	return and.length > 0 ? { AND: and } : {};
}

export async function listRollOverCandidates(
	db: AdminDbClient,
	input: RollOverListInput,
	options?: { skip?: number; take?: number },
) {
	const direction = input.sortDirection;

	return db.rollOver.findMany({
		where: buildRollOverWhere(input),
		select: rollOverSummarySelect,
		orderBy: [{ createdAt: direction }, { id: direction }],
		skip: options?.skip,
		take: options?.take,
	});
}

export async function countRollOverCandidates(
	db: AdminDbClient,
	input: RollOverListInput,
) {
	return db.rollOver.count({ where: buildRollOverWhere(input) });
}

export async function getRollOverStats(db: AdminDbClient) {
	const [total, byStatus, openQuantity] = await Promise.all([
		db.rollOver.count(),
		db.rollOver.groupBy({ by: ["status"], _count: { _all: true } }),
		db.rollOver.aggregate({
			where: { status: "open" },
			_sum: { quantity: true },
		}),
	]);

	return { total, byStatus, openQuantity: openQuantity._sum.quantity };
}
