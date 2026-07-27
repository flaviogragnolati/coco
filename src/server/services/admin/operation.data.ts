import { Prisma } from "~/prisma/client";
import type {
	OperationCreateInput,
	OperationListInput,
	OperationReviewState,
} from "~/shared/common/admin-crud/operation.types";
import { fromDateTimeLocalValue } from "~/shared/common/date.helpers";
import { operationAvailableActions } from "~/shared/common/fulfillment-transitions";
import { toPrismaInputJson } from "./_base/prisma-json";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";
import {
	diagnosticMessages,
	highestSeverity,
} from "./operational-diagnostics.types";

type AdminDbClient = Prisma.TransactionClient;

const decimalZero = () => new Prisma.Decimal(0);

const operationUserSummarySelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	deleted: true,
} satisfies Prisma.UserSelect;

const operationDestinationSummarySelect = {
	id: true,
	name: true,
	active: true,
	deleted: true,
} satisfies Prisma.DestinationSelect;

const operationSupplierSummarySelect = {
	id: true,
	name: true,
	active: true,
	deleted: true,
} satisfies Prisma.SupplierSelect;

const operationListSelect = {
	id: true,
	code: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	finishedAt: true,
	from: true,
	to: true,
	includeRollOver: true,
	strategy: true,
	notes: true,
	failureReason: true,
	reviewState: true,
	eligibleQuantity: true,
	assignedQuantity: true,
	rollOverQuantity: true,
	eligibleItemCount: true,
	assignedItemCount: true,
	rollOverItemCount: true,
	lotCount: true,
	supplierOrderCount: true,
	destination: {
		select: operationDestinationSummarySelect,
	},
	triggeredByUser: {
		select: operationUserSummarySelect,
	},
} satisfies Prisma.OperationSelect;

/**
 * The relations the diagnostic rules read, kept thin on purpose: the list pays
 * for these joins on every page, so it selects ids and quantities only. The
 * detail select below is a structural superset, which is what lets both feed
 * `calculateOperationDiagnostics`.
 */
const operationDiagnosticsRelationSelect = {
	lots: {
		select: {
			id: true,
			code: true,
			status: true,
			// `status` is here for `operationAvailableActions`, which measures the
			// administrative window over the live supplier orders (architecture §8).
			supplierOrder: { select: { id: true, status: true } },
			lotItems: { select: { id: true, status: true, quantity: true } },
		},
	},
	rollOvers: {
		select: { id: true, status: true },
	},
} satisfies Prisma.OperationSelect;

const operationSummarySelect = {
	...operationListSelect,
	...operationDiagnosticsRelationSelect,
} satisfies Prisma.OperationSelect;

const operationSupplierOrderSummarySelect = {
	id: true,
	code: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	supplier: {
		select: operationSupplierSummarySelect,
	},
} satisfies Prisma.SupplierOrderSelect;

const operationDetailSelect = {
	...operationListSelect,
	summary: true,
	lots: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			code: true,
			status: true,
			createdAt: true,
			updatedAt: true,
			supplier: {
				select: operationSupplierSummarySelect,
			},
			supplierOrder: {
				select: operationSupplierOrderSummarySelect,
			},
			lotItems: {
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				select: {
					id: true,
					code: true,
					status: true,
					quantity: true,
					destination: {
						select: operationDestinationSummarySelect,
					},
					productSupplierTerms: {
						select: {
							id: true,
							product: {
								select: {
									id: true,
									name: true,
									unit: true,
								},
							},
							supplier: {
								select: operationSupplierSummarySelect,
							},
						},
					},
					cartItemLotItems: {
						orderBy: [{ createdAt: "asc" }, { id: "asc" }],
						select: {
							id: true,
							quantity: true,
							cartItem: {
								select: {
									id: true,
									code: true,
									quantity: true,
									fulfillmentStatus: true,
									cart: {
										select: {
											id: true,
											code: true,
											user: {
												select: operationUserSummarySelect,
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	},
	rollOvers: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			stage: true,
			status: true,
			quantity: true,
			reason: true,
			createdAt: true,
			updatedAt: true,
			cartItem: {
				select: {
					id: true,
					code: true,
					quantity: true,
					cart: {
						select: {
							id: true,
							code: true,
							user: {
								select: operationUserSummarySelect,
							},
						},
					},
					productClientTerms: {
						select: {
							id: true,
							product: {
								select: {
									id: true,
									name: true,
									unit: true,
								},
							},
						},
					},
				},
			},
		},
	},
} satisfies Prisma.OperationSelect;

/**
 * What compensation needs and nothing else: the live records it moves, the
 * allocations whose quantity returns to the pool, and each supplier order's full
 * lot list so an order spanning operations can be refused (architecture §19).
 */
const operationCommandSelect = {
	id: true,
	code: true,
	status: true,
	lots: {
		select: {
			id: true,
			status: true,
			supplierOrder: {
				select: {
					id: true,
					code: true,
					status: true,
					lots: { select: { id: true, operationId: true } },
				},
			},
			lotItems: {
				select: {
					id: true,
					status: true,
					cartItemLotItems: {
						select: {
							id: true,
							quantity: true,
							cartItem: {
								select: { id: true, cart: { select: { id: true } } },
							},
						},
					},
				},
			},
		},
	},
	rollOvers: {
		select: {
			id: true,
			status: true,
			quantity: true,
			cartItem: { select: { id: true, cart: { select: { id: true } } } },
		},
	},
} satisfies Prisma.OperationSelect;

export type OperationCommandRecord = Prisma.OperationGetPayload<{
	select: typeof operationCommandSelect;
}>;

export type OperationListRecord = Prisma.OperationGetPayload<{
	select: typeof operationListSelect;
}>;

export type OperationSummaryRecord = Prisma.OperationGetPayload<{
	select: typeof operationSummarySelect;
}>;

export type OperationDetailRecord = Prisma.OperationGetPayload<{
	select: typeof operationDetailSelect;
}>;

function buildOperationWhere(
	input: OperationListInput,
): Prisma.OperationWhereInput {
	const and: Prisma.OperationWhereInput[] = [];

	if (input.status !== undefined) and.push({ status: input.status });
	if (input.strategy !== undefined) and.push({ strategy: input.strategy });

	if (input.search !== undefined) {
		and.push({
			OR: [
				{ code: { contains: input.search } },
				{ notes: { contains: input.search } },
				{ destination: { name: { contains: input.search } } },
				{ triggeredByUser: { name: { contains: input.search } } },
				{ triggeredByUser: { email: { contains: input.search } } },
			],
		});
	}

	return and.length > 0 ? { AND: and } : {};
}

/**
 * Statuses of the supplier orders the operation still owns, one entry per order.
 * Cancelled orders are dropped here rather than inside
 * `operationAvailableActions`: an order cancelled through the supplier loop does
 * not close the administrative window (architecture §8).
 */
function liveSupplierOrderStatuses(record: OperationSummaryRecord) {
	return Array.from(
		new Map(
			record.lots
				.filter((lot) => lot.status !== "cancelled")
				.flatMap((lot) => (lot.supplierOrder ? [lot.supplierOrder] : []))
				.filter((order) => order.status !== "cancelled")
				.map((order) => [order.id, order.status]),
		).values(),
	);
}

export function toOperationListItem(
	record: OperationSummaryRecord,
	diagnostics: OperationalDiagnostic[],
) {
	const { lots: _lots, rollOvers: _rollOvers, ...rest } = record;

	return {
		...rest,
		eligibleQuantity: record.eligibleQuantity.toString(),
		assignedQuantity: record.assignedQuantity.toString(),
		rollOverQuantity: record.rollOverQuantity.toString(),
		diagnosticCount: diagnostics.length,
		highestDiagnosticSeverity: highestSeverity(diagnostics),
		diagnosticMessages: diagnosticMessages(diagnostics),
		availableActions: operationAvailableActions({
			status: record.status,
			liveSupplierOrderStatuses: liveSupplierOrderStatuses(record),
			lotCount: record.lots.length,
			rollOverCount: record.rollOvers.length,
		}),
	};
}

export function toOperationDetail(
	record: OperationDetailRecord,
	diagnostics: OperationalDiagnostic[],
) {
	const supplierOrders = Array.from(
		new Map(
			record.lots
				.map((lot) => lot.supplierOrder)
				.filter((order): order is NonNullable<typeof order> => order !== null)
				.map((order) => [order.id, order]),
		).values(),
	).sort((left, right) => left.id - right.id);

	return {
		...toOperationListItem(record, diagnostics),
		summary: record.summary,
		diagnostics,
		lots: record.lots.map((lot) => ({
			...lot,
			lotItems: lot.lotItems.map((lotItem) => ({
				...lotItem,
				quantity: lotItem.quantity.toString(),
				cartItemLotItems: lotItem.cartItemLotItems.map((allocation) => ({
					...allocation,
					quantity: allocation.quantity.toString(),
					cartItem: {
						...allocation.cartItem,
						quantity: allocation.cartItem.quantity.toString(),
					},
				})),
			})),
		})),
		rollOvers: record.rollOvers.map((rollOver) => ({
			...rollOver,
			quantity: rollOver.quantity.toString(),
			cartItem: {
				...rollOver.cartItem,
				quantity: rollOver.cartItem.quantity.toString(),
			},
		})),
		supplierOrders,
	};
}

export async function listOperationCandidates(
	db: AdminDbClient,
	input: OperationListInput,
	options?: { skip?: number; take?: number },
) {
	const direction = input.sortDirection;

	return db.operation.findMany({
		where: buildOperationWhere(input),
		select: operationSummarySelect,
		orderBy: [{ createdAt: direction }, { id: direction }],
		skip: options?.skip,
		take: options?.take,
	});
}

export async function countOperationCandidates(
	db: AdminDbClient,
	input: OperationListInput,
) {
	return db.operation.count({ where: buildOperationWhere(input) });
}

export async function findOperationById(db: AdminDbClient, id: number) {
	return db.operation.findUnique({
		where: { id },
		select: operationDetailSelect,
	});
}

/**
 * How many completed operations must have run after a batch before its still
 * open roll overs stop looking like normal turnaround.
 */
const STALE_ROLLOVER_OPERATION_LAG = 2;

/**
 * `createdAt` of the N-th most recent completed operation, or null while fewer
 * than N exist. One query per request feeds every row's stale-roll over rule —
 * the rule itself stays pure.
 */
export async function findStaleOpenRollOverThreshold(db: AdminDbClient) {
	const recent = await db.operation.findMany({
		where: { status: "completed" },
		select: { createdAt: true },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: STALE_ROLLOVER_OPERATION_LAG,
	});

	if (recent.length < STALE_ROLLOVER_OPERATION_LAG) return null;
	return recent[recent.length - 1]?.createdAt ?? null;
}

export async function getOperationStats(db: AdminDbClient) {
	const [total, draft, running, completed, failed, cancelled, aggregate] =
		await Promise.all([
			db.operation.count(),
			db.operation.count({ where: { status: "draft" } }),
			db.operation.count({ where: { status: "running" } }),
			db.operation.count({ where: { status: "completed" } }),
			db.operation.count({ where: { status: "failed" } }),
			db.operation.count({ where: { status: "cancelled" } }),
			db.operation.aggregate({
				_sum: {
					eligibleQuantity: true,
					assignedQuantity: true,
					rollOverQuantity: true,
				},
			}),
		]);

	return {
		total,
		draft,
		running,
		completed,
		failed,
		cancelled,
		eligibleQuantity:
			aggregate._sum.eligibleQuantity?.toString() ?? decimalZero().toString(),
		assignedQuantity:
			aggregate._sum.assignedQuantity?.toString() ?? decimalZero().toString(),
		rollOverQuantity:
			aggregate._sum.rollOverQuantity?.toString() ?? decimalZero().toString(),
	};
}

export async function findActiveDestination(db: AdminDbClient, id: number) {
	return db.destination.findFirst({
		where: { id, active: true, deleted: false },
		select: operationDestinationSummarySelect,
	});
}

export async function createRunningOperation(
	db: AdminDbClient,
	input: OperationCreateInput & {
		code: string;
		triggeredByUserId: string;
	},
) {
	return db.operation.create({
		data: {
			code: input.code,
			status: "running",
			from: fromDateTimeLocalValue(input.from),
			to: fromDateTimeLocalValue(input.to),
			includeRollOver: input.includeRollOver,
			strategy: input.strategy,
			notes: input.notes,
			triggeredByUserId: input.triggeredByUserId,
			destinationId: input.destinationId,
			summary: toPrismaInputJson({
				source: "operation.createAndExecute",
				status: "running",
				startedAt: new Date().toISOString(),
			}),
		},
		select: operationListSelect,
	});
}

/**
 * A draft carries none of the running row's optimistic summary: it has executed
 * nothing, so every counter stays at its zero default and `summary` stays null
 * until `execute` writes the real one. What it does carry is an empty omission
 * set, so `reviewState` has the shape every later read expects (ADR 0006).
 */
export async function createDraftOperation(
	db: AdminDbClient,
	input: OperationCreateInput & {
		code: string;
		triggeredByUserId: string;
	},
) {
	return db.operation.create({
		data: {
			code: input.code,
			status: "draft",
			from: fromDateTimeLocalValue(input.from),
			to: fromDateTimeLocalValue(input.to),
			includeRollOver: input.includeRollOver,
			strategy: input.strategy,
			notes: input.notes,
			triggeredByUserId: input.triggeredByUserId,
			destinationId: input.destinationId,
			summary: Prisma.DbNull,
			reviewState: toPrismaInputJson({
				omissions: { sourceKeys: [], userIds: [] },
			} satisfies OperationReviewState),
		},
		select: operationListSelect,
	});
}

export async function updateDraftOperation(
	db: AdminDbClient,
	input: {
		id: number;
		parameters?: Partial<OperationCreateInput>;
		reviewState: OperationReviewState;
	},
) {
	const { parameters } = input;

	await db.operation.update({
		where: { id: input.id },
		data: {
			...(parameters?.from === undefined
				? {}
				: { from: fromDateTimeLocalValue(parameters.from) }),
			...(parameters?.to === undefined
				? {}
				: { to: fromDateTimeLocalValue(parameters.to) }),
			...(parameters?.includeRollOver === undefined
				? {}
				: { includeRollOver: parameters.includeRollOver }),
			...(parameters?.strategy === undefined
				? {}
				: { strategy: parameters.strategy }),
			...(parameters?.notes === undefined ? {} : { notes: parameters.notes }),
			...(parameters?.destinationId === undefined
				? {}
				: { destinationId: parameters.destinationId }),
			reviewState: toPrismaInputJson(input.reviewState),
		},
	});
}

/**
 * The parameters `review` and `execute` need, plus the persisted omissions. Read
 * separately from `operationCommandSelect` because a draft owns no relations
 * worth joining.
 */
export async function findDraftForExecution(db: AdminDbClient, id: number) {
	return db.operation.findUnique({
		where: { id },
		select: {
			id: true,
			code: true,
			status: true,
			from: true,
			to: true,
			includeRollOver: true,
			strategy: true,
			notes: true,
			destinationId: true,
			reviewState: true,
		},
	});
}

/**
 * How long a draft may sit unexecuted before it reads as forgotten rather than
 * pending. Matches `staleCarrierRequestThreshold`: both measure a human who owes
 * an answer, not goods in motion.
 */
const STALE_DRAFT_DAYS = 3;

export function staleDraftThreshold(now = new Date()): Date {
	return new Date(now.getTime() - STALE_DRAFT_DAYS * 86_400_000);
}

export async function findOperationForCommand(db: AdminDbClient, id: number) {
	return db.operation.findUnique({
		where: { id },
		select: operationCommandSelect,
	});
}

/**
 * The status-only compensation write (architecture §8). No quantity is touched:
 * a cancelled record keeps it as history and the counter rules exclude it by
 * status, exactly as Phase 1 settled.
 */
export async function applyOperationCompensation(
	db: AdminDbClient,
	input: {
		operationId: number;
		lotIds: number[];
		lotItemIds: number[];
		supplierOrderIds: number[];
		createdRollOverIds: number[];
	},
) {
	if (input.lotItemIds.length > 0) {
		await db.lotItem.updateMany({
			where: { id: { in: input.lotItemIds } },
			data: { status: "cancelled" },
		});
	}

	if (input.lotIds.length > 0) {
		await db.lot.updateMany({
			where: { id: { in: input.lotIds } },
			data: { status: "cancelled" },
		});
	}

	if (input.supplierOrderIds.length > 0) {
		await db.supplierOrder.updateMany({
			where: { id: { in: input.supplierOrderIds } },
			data: { status: "cancelled", cancelledAt: new Date() },
		});
	}

	if (input.createdRollOverIds.length > 0) {
		await db.rollOver.updateMany({
			where: { id: { in: input.createdRollOverIds } },
			data: { status: "cancelled" },
		});
	}

	// The roll overs this operation consumed go back to `open` so their quantity
	// re-enters aggregation. No counter recompute for the operations that own
	// them: `computeOperationCounters` counts `open` and `rebatched` alike.
	return db.rollOver.updateMany({
		where: {
			rebatchedIntoOperationId: input.operationId,
			status: "rebatched",
		},
		data: { status: "open", rebatchedIntoOperationId: null },
	});
}

export async function markOperationCancelled(db: AdminDbClient, id: number) {
	await db.operation.update({
		where: { id },
		data: { status: "cancelled" },
	});
}

export async function updateOperationForRerun(
	db: AdminDbClient,
	input: OperationCreateInput & { id: number },
) {
	await db.operation.update({
		where: { id: input.id },
		data: {
			status: "running",
			failureReason: null,
			finishedAt: null,
			from: fromDateTimeLocalValue(input.from),
			to: fromDateTimeLocalValue(input.to),
			includeRollOver: input.includeRollOver,
			strategy: input.strategy,
			notes: input.notes,
			destinationId: input.destinationId,
			summary: toPrismaInputJson({
				source: "operation.rerun",
				status: "running",
				startedAt: new Date().toISOString(),
			}),
		},
	});
}

export async function deleteOperation(db: AdminDbClient, id: number) {
	await db.operation.delete({ where: { id } });
}

export async function markOperationFailed(
	db: AdminDbClient,
	input: {
		id: number;
		failureReason: string;
	},
) {
	return db.operation.update({
		where: { id: input.id },
		data: {
			status: "failed",
			finishedAt: new Date(),
			failureReason: input.failureReason,
			summary: toPrismaInputJson({
				source: "operation.createAndExecute",
				status: "failed",
				failedAt: new Date().toISOString(),
				failureReason: input.failureReason,
			}),
		},
		select: operationDetailSelect,
	});
}
