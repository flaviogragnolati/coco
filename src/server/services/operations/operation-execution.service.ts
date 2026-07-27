import { Prisma } from "~/prisma/client";
import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { toPrismaInputJson } from "~/server/services/admin/_base/prisma-json";
import { runSerializable } from "~/server/services/admin/_base/serializable-transaction";
import {
	calculateAssignableQuantity,
	type OperationSupplierTermCandidate,
	resolveSupplierTermForProduct,
} from "./operation-assignment.helpers";

type OperationDb = Prisma.TransactionClient;

export type OperationExecutionInput = {
	operationId: number;
	actor: AdminMutationActor;
};

type DemandItem = {
	sourceKey: string;
	sourceRollOverId?: number;
	cartItemId: number;
	cartId: number;
	cartCode: string;
	quantity: Prisma.Decimal;
	paidAt: Date;
	orderItemCreatedAt: Date;
	product: {
		id: number;
		name: string;
		unit: string;
		defaultSupplierId: number | null;
		active: boolean;
		deleted: boolean;
		supplierTerms: OperationSupplierTermCandidate[];
	};
};

type ResolvedAssignment = {
	demand: DemandItem;
	supplierTerm: OperationSupplierTermCandidate;
	assignedQuantity: Prisma.Decimal;
	rollOverQuantity: Prisma.Decimal;
	rollOverReason?: string;
};

type RollOverInput = {
	demand: DemandItem;
	quantity: Prisma.Decimal;
	reason: string;
};

type MaterializedAllocation = {
	cartItemId: number;
	cartId: number;
	cartItemLotItemId: number;
	lotId: number;
	lotItemId: number;
	quantity: Prisma.Decimal;
};

type MaterializedRollOver = {
	id: number;
	cartItemId: number;
	cartId: number;
	quantity: Prisma.Decimal;
};

const decimalZero = () => new Prisma.Decimal(0);

function isPositive(value: Prisma.Decimal) {
	return value.gt(decimalZero());
}

function sumDecimals(values: Prisma.Decimal[]) {
	return values.reduce((total, value) => total.plus(value), decimalZero());
}

function minDate(values: Date[]) {
	return values.reduce<Date | null>((earliest, value) => {
		if (earliest === null || value < earliest) return value;
		return earliest;
	}, null);
}

function buildCode(prefix: string, operationId: number) {
	return `${prefix}-${operationId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function requireValue<K, V>(map: Map<K, V>, key: K, label: string): V {
	const value = map.get(key);
	if (value === undefined) {
		throw new Error(`Missing ${label} for ${String(key)}`);
	}
	return value;
}

function resolveAssignments(demandItems: DemandItem[], now: Date) {
	const assignments: ResolvedAssignment[] = [];
	const rollOvers: RollOverInput[] = [];

	for (const demand of demandItems) {
		if (!demand.product.active || demand.product.deleted) {
			rollOvers.push({
				demand,
				quantity: demand.quantity,
				reason: `Producto inactivo o eliminado: ${demand.product.name}`,
			});
			continue;
		}

		const supplierResolution = resolveSupplierTermForProduct(
			demand.product,
			now,
		);
		if (!supplierResolution.term) {
			rollOvers.push({
				demand,
				quantity: demand.quantity,
				reason: supplierResolution.reason ?? "Proveedor no resuelto",
			});
			continue;
		}

		const assignedQuantity = calculateAssignableQuantity({
			quantity: demand.quantity,
			moq: supplierResolution.term.moq,
			step: supplierResolution.term.step,
			max: supplierResolution.term.max,
		});
		const rollOverQuantity = demand.quantity.minus(assignedQuantity);

		if (isPositive(assignedQuantity)) {
			assignments.push({
				demand,
				supplierTerm: supplierResolution.term,
				assignedQuantity,
				rollOverQuantity,
				rollOverReason: isPositive(rollOverQuantity)
					? "Cantidad excedente o fuera de step de proveedor"
					: undefined,
			});
		}

		if (isPositive(rollOverQuantity)) {
			rollOvers.push({
				demand,
				quantity: rollOverQuantity,
				reason:
					assignedQuantity.eq(0) &&
					demand.quantity.lt(supplierResolution.term.moq)
						? "Cantidad menor al MOQ de proveedor"
						: "Cantidad excedente o fuera de step de proveedor",
			});
		}
	}

	return { assignments, rollOvers };
}

const demandCartItemSelect = {
	id: true,
	code: true,
	quantity: true,
	cartId: true,
	cart: {
		select: {
			id: true,
			code: true,
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
					defaultSupplierId: true,
					active: true,
					deleted: true,
					productSupplierTerms: {
						select: {
							id: true,
							supplierId: true,
							moq: true,
							step: true,
							max: true,
							fromDate: true,
							toDate: true,
							active: true,
							deleted: true,
							supplier: {
								select: {
									id: true,
									name: true,
									active: true,
									deleted: true,
								},
							},
						},
						orderBy: [{ supplierId: "asc" }, { id: "asc" }],
					},
				},
			},
		},
	},
} satisfies Prisma.CartItemSelect;

type DemandCartItemRecord = Prisma.CartItemGetPayload<{
	select: typeof demandCartItemSelect;
}>;

function toDemandItem(input: {
	sourceKey: string;
	sourceRollOverId?: number;
	cartItem: DemandCartItemRecord;
	quantity: Prisma.Decimal;
	paidAt: Date;
	orderItemCreatedAt: Date;
}): DemandItem {
	return {
		sourceKey: input.sourceKey,
		sourceRollOverId: input.sourceRollOverId,
		cartItemId: input.cartItem.id,
		cartId: input.cartItem.cartId,
		cartCode: input.cartItem.cart.code,
		quantity: input.quantity,
		paidAt: input.paidAt,
		orderItemCreatedAt: input.orderItemCreatedAt,
		product: {
			id: input.cartItem.productClientTerms.product.id,
			name: input.cartItem.productClientTerms.product.name,
			unit: input.cartItem.productClientTerms.product.unit,
			defaultSupplierId:
				input.cartItem.productClientTerms.product.defaultSupplierId,
			active: input.cartItem.productClientTerms.product.active,
			deleted: input.cartItem.productClientTerms.product.deleted,
			supplierTerms:
				input.cartItem.productClientTerms.product.productSupplierTerms,
		},
	};
}

async function listOriginalDemand(
	db: OperationDb,
	input: { from: Date; to: Date },
) {
	const records = await db.userOrderItem.findMany({
		where: {
			userOrder: {
				transactions: {
					some: {
						status: "completed",
						completedAt: {
							gte: input.from,
							lte: input.to,
						},
					},
				},
			},
			sourceCartItem: {
				deleted: false,
				status: "submitted",
				cart: {
					deleted: false,
					status: "submitted",
				},
				// Only *live* allocations exclude a cart item. A compensated one keeps
				// its cancelled bridge rows as history and must become aggregable again
				// (architecture §8). Safety rests on the open-roll over clause below,
				// which is what keeps a supplier-cancelled item — whose cancellation
				// always mints an open roll over — from being counted twice. Never
				// weaken the two together.
				cartItemLotItems: {
					none: {
						lotItem: {
							status: { not: "cancelled" },
							lot: { status: { not: "cancelled" } },
						},
					},
				},
				rollOvers: { none: { status: "open" } },
			},
		},
		select: {
			id: true,
			quantity: true,
			createdAt: true,
			sourceCartItem: {
				select: demandCartItemSelect,
			},
			userOrder: {
				select: {
					transactions: {
						where: {
							status: "completed",
							completedAt: {
								gte: input.from,
								lte: input.to,
							},
						},
						select: { completedAt: true },
						orderBy: [{ completedAt: "asc" }, { id: "asc" }],
					},
				},
			},
		},
	});

	return records
		.map((record) => {
			const paidAt = record.userOrder.transactions[0]?.completedAt;
			if (!paidAt) return null;

			return toDemandItem({
				sourceKey: `orderItem:${record.id}`,
				cartItem: record.sourceCartItem,
				quantity: record.quantity,
				paidAt,
				orderItemCreatedAt: record.createdAt,
			});
		})
		.filter((item): item is DemandItem => item !== null);
}

async function listOpenRollOverDemand(
	db: OperationDb,
	input: { operationId: number },
) {
	const records = await db.rollOver.findMany({
		where: {
			status: "open",
			operationId: { not: input.operationId },
			cartItem: {
				deleted: false,
				status: "submitted",
			},
		},
		select: {
			id: true,
			quantity: true,
			createdAt: true,
			cartItem: {
				select: {
					...demandCartItemSelect,
					userOrderItems: {
						select: {
							createdAt: true,
							userOrder: {
								select: {
									transactions: {
										where: {
											status: "completed",
											completedAt: { not: null },
										},
										select: { completedAt: true },
										orderBy: [{ completedAt: "asc" }, { id: "asc" }],
									},
								},
							},
						},
						orderBy: [{ createdAt: "asc" }, { id: "asc" }],
					},
				},
			},
		},
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
	});

	return records.map((record) => {
		const paidAt =
			minDate(
				record.cartItem.userOrderItems.flatMap((orderItem) =>
					orderItem.userOrder.transactions
						.map((transaction) => transaction.completedAt)
						.filter((value): value is Date => value !== null),
				),
			) ?? record.createdAt;
		const orderItemCreatedAt =
			record.cartItem.userOrderItems[0]?.createdAt ?? record.createdAt;

		return toDemandItem({
			sourceKey: `rollOver:${record.id}`,
			sourceRollOverId: record.id,
			cartItem: record.cartItem,
			quantity: record.quantity,
			paidAt,
			orderItemCreatedAt,
		});
	});
}

function sortDemandItems(items: DemandItem[]) {
	return [...items].sort((left, right) => {
		const paidDiff = left.paidAt.getTime() - right.paidAt.getTime();
		if (paidDiff !== 0) return paidDiff;

		const orderItemDiff =
			left.orderItemCreatedAt.getTime() - right.orderItemCreatedAt.getTime();
		if (orderItemDiff !== 0) return orderItemDiff;

		return left.cartItemId - right.cartItemId;
	});
}

async function validateOperation(db: OperationDb, operationId: number) {
	const operation = await db.operation.findUnique({
		where: { id: operationId },
		select: {
			id: true,
			code: true,
			from: true,
			to: true,
			includeRollOver: true,
			strategy: true,
			destinationId: true,
			destination: {
				select: {
					id: true,
					name: true,
					active: true,
					deleted: true,
				},
			},
		},
	});

	if (!operation) throw new Error("Operation not found");
	if (operation.strategy !== "fifo") {
		throw new Error("Only FIFO operations are supported in V1");
	}
	if (!operation.destination || !operation.destinationId) {
		throw new Error("Operation destination is required");
	}
	if (!operation.destination.active || operation.destination.deleted) {
		throw new Error("Operation destination is not active");
	}

	return operation;
}

async function buildDemand(
	db: OperationDb,
	operation: {
		id: number;
		from: Date;
		to: Date;
		includeRollOver: boolean;
	},
) {
	const originalDemand = await listOriginalDemand(db, {
		from: operation.from,
		to: operation.to,
	});
	const rollOverDemand = operation.includeRollOver
		? await listOpenRollOverDemand(db, { operationId: operation.id })
		: [];

	return sortDemandItems([...rollOverDemand, ...originalDemand]);
}

function assignmentKey(input: {
	supplierId: number;
	productSupplierTermsId: number;
	destinationId: number;
}) {
	return `${input.supplierId}:${input.productSupplierTermsId}:${input.destinationId}`;
}

type SupplierAccumulator = {
	supplierId: number;
	supplierOrderCode: string;
	lotCode: string;
};

type LotItemAccumulator = {
	supplierId: number;
	productSupplierTermsId: number;
	code: string;
	quantity: Prisma.Decimal;
};

type AllocationAccumulator = {
	cartItemId: number;
	cartId: number;
	assignmentKey: string;
	quantity: Prisma.Decimal;
};

/**
 * Pure grouping pass: fold the assignments into one supplier order + lot per
 * supplier, one lot item per assignment key (with summed quantity), and one
 * demand allocation per (cart item, assignment key). Every code is generated
 * here so the bulk-write pass can look up the returned id by its code rather
 * than by array position.
 */
function groupAssignments(input: {
	operationId: number;
	destinationId: number;
	assignments: ResolvedAssignment[];
}) {
	const suppliers = new Map<number, SupplierAccumulator>();
	const lotItems = new Map<string, LotItemAccumulator>();
	const allocations = new Map<string, AllocationAccumulator>();

	for (const assignment of input.assignments) {
		const supplierId = assignment.supplierTerm.supplierId;

		if (!suppliers.has(supplierId)) {
			suppliers.set(supplierId, {
				supplierId,
				supplierOrderCode: buildCode("SORD-OP", input.operationId),
				lotCode: buildCode("LOT-OP", input.operationId),
			});
		}

		const key = assignmentKey({
			supplierId,
			productSupplierTermsId: assignment.supplierTerm.id,
			destinationId: input.destinationId,
		});
		const lotItem = lotItems.get(key);
		if (lotItem) {
			lotItem.quantity = lotItem.quantity.plus(assignment.assignedQuantity);
		} else {
			lotItems.set(key, {
				supplierId,
				productSupplierTermsId: assignment.supplierTerm.id,
				code: buildCode("LITEM-OP", input.operationId),
				quantity: assignment.assignedQuantity,
			});
		}

		const allocationKey = `${assignment.demand.cartItemId}:${key}`;
		const allocation = allocations.get(allocationKey);
		if (allocation) {
			allocation.quantity = allocation.quantity.plus(
				assignment.assignedQuantity,
			);
		} else {
			allocations.set(allocationKey, {
				cartItemId: assignment.demand.cartItemId,
				cartId: assignment.demand.cartId,
				assignmentKey: key,
				quantity: assignment.assignedQuantity,
			});
		}
	}

	return { suppliers, lotItems, allocations };
}

async function materializeAssignments(
	db: OperationDb,
	input: {
		operationId: number;
		destinationId: number;
		assignments: ResolvedAssignment[];
	},
) {
	if (input.assignments.length === 0) {
		return { allocations: [], lotCount: 0, supplierOrderCount: 0 };
	}

	const { suppliers, lotItems, allocations } = groupAssignments(input);

	const supplierList = Array.from(suppliers.values());
	const supplierOrderRows = await db.supplierOrder.createManyAndReturn({
		data: supplierList.map((supplier) => ({
			code: supplier.supplierOrderCode,
			supplierId: supplier.supplierId,
			status: "pending",
			metadata: toPrismaInputJson({
				source: "operation.createAndExecute",
				operationId: String(input.operationId),
			}),
		})),
		select: { id: true, code: true },
	});
	const supplierOrderIdByCode = new Map(
		supplierOrderRows.map((row) => [row.code, row.id]),
	);

	const lotRows = await db.lot.createManyAndReturn({
		data: supplierList.map((supplier) => ({
			code: supplier.lotCode,
			status: "assembling",
			operationId: input.operationId,
			supplierId: supplier.supplierId,
			supplierOrderId: requireValue(
				supplierOrderIdByCode,
				supplier.supplierOrderCode,
				"supplier order id",
			),
		})),
		select: { id: true, code: true },
	});
	const lotIdByCode = new Map(lotRows.map((row) => [row.code, row.id]));

	const lotItemList = Array.from(lotItems.values());
	const lotItemRows = await db.lotItem.createManyAndReturn({
		data: lotItemList.map((lotItem) => {
			const supplier = requireValue(suppliers, lotItem.supplierId, "supplier");
			return {
				code: lotItem.code,
				status: "pending" as const,
				lotId: requireValue(lotIdByCode, supplier.lotCode, "lot id"),
				supplierId: lotItem.supplierId,
				destinationId: input.destinationId,
				productSupplierTermsId: lotItem.productSupplierTermsId,
				quantity: lotItem.quantity.toString(),
			};
		}),
		select: { id: true, code: true },
	});
	const lotItemIdByCode = new Map(lotItemRows.map((row) => [row.code, row.id]));

	const lotIdByLotItemId = new Map<number, number>();
	for (const lotItem of lotItems.values()) {
		const lotItemId = requireValue(
			lotItemIdByCode,
			lotItem.code,
			"lot item id",
		);
		const supplier = requireValue(suppliers, lotItem.supplierId, "supplier");
		lotIdByLotItemId.set(
			lotItemId,
			requireValue(lotIdByCode, supplier.lotCode, "lot id"),
		);
	}

	const allocationList = Array.from(allocations.values());
	const cartIdByAllocation = new Map<string, number>();
	for (const allocation of allocationList) {
		const lotItem = requireValue(
			lotItems,
			allocation.assignmentKey,
			"lot item",
		);
		const lotItemId = requireValue(
			lotItemIdByCode,
			lotItem.code,
			"lot item id",
		);
		cartIdByAllocation.set(
			`${allocation.cartItemId}:${lotItemId}`,
			allocation.cartId,
		);
	}

	const allocationRows = await db.cartItemLotItem.createManyAndReturn({
		data: allocationList.map((allocation) => {
			const lotItem = requireValue(
				lotItems,
				allocation.assignmentKey,
				"lot item",
			);
			return {
				cartItemId: allocation.cartItemId,
				lotItemId: requireValue(lotItemIdByCode, lotItem.code, "lot item id"),
				quantity: allocation.quantity.toString(),
			};
		}),
		select: { id: true, cartItemId: true, quantity: true, lotItemId: true },
	});

	const materialized: MaterializedAllocation[] = allocationRows.map((row) => ({
		cartItemId: row.cartItemId,
		cartId: requireValue(
			cartIdByAllocation,
			`${row.cartItemId}:${row.lotItemId}`,
			"cart id",
		),
		cartItemLotItemId: row.id,
		lotId: requireValue(lotIdByLotItemId, row.lotItemId, "lot id"),
		lotItemId: row.lotItemId,
		quantity: row.quantity,
	}));

	return {
		allocations: materialized,
		lotCount: suppliers.size,
		supplierOrderCount: suppliers.size,
	};
}

async function materializeRollOvers(
	db: OperationDb,
	input: {
		operationId: number;
		rollOvers: RollOverInput[];
	},
) {
	const positiveRollOvers = input.rollOvers.filter((rollOver) =>
		isPositive(rollOver.quantity),
	);

	const createdRollOvers: MaterializedRollOver[] = [];
	if (positiveRollOvers.length > 0) {
		const rows = await db.rollOver.createManyAndReturn({
			data: positiveRollOvers.map((rollOver) => ({
				cartItemId: rollOver.demand.cartItemId,
				operationId: input.operationId,
				stage: "preAllocation" as const,
				status: "open" as const,
				quantity: rollOver.quantity.toString(),
				reason: rollOver.reason,
			})),
			select: { id: true, cartItemId: true, quantity: true },
		});

		// createManyAndReturn issues a single INSERT ... RETURNING, so rows come
		// back in input order; the length assertion turns any future violation
		// into a loud failure inside the transaction rather than a silent
		// mis-attribution of cartId (RollOver has no unique code to join on).
		if (rows.length !== positiveRollOvers.length) {
			throw new Error(
				`Roll over bulk insert returned ${rows.length} rows for ${positiveRollOvers.length} inputs`,
			);
		}

		positiveRollOvers.forEach((rollOver, index) => {
			const row = rows[index];
			if (row === undefined) return;
			createdRollOvers.push({
				id: row.id,
				cartItemId: row.cartItemId,
				cartId: rollOver.demand.cartId,
				quantity: row.quantity,
			});
		});
	}

	const rebatchedIds = Array.from(
		new Set(
			input.rollOvers
				.map((rollOver) => rollOver.demand.sourceRollOverId)
				.filter((id): id is number => id !== undefined),
		),
	);

	if (rebatchedIds.length > 0) {
		await db.rollOver.updateMany({
			where: { id: { in: rebatchedIds } },
			data: {
				status: "rebatched",
				rebatchedIntoOperationId: input.operationId,
			},
		});
	}

	return createdRollOvers;
}

/**
 * The back-link is what lets a later compensation of this operation return the
 * consumed roll overs to `open`: `RollOver.operationId` records only the
 * operation that created them (ADR 0005, architecture §11).
 */
async function markAssignedSourceRollOversRebatched(
	db: OperationDb,
	input: { operationId: number; assignments: ResolvedAssignment[] },
) {
	const ids = input.assignments
		.map((assignment) => assignment.demand.sourceRollOverId)
		.filter((id): id is number => id !== undefined);
	if (ids.length === 0) return;

	await db.rollOver.updateMany({
		where: { id: { in: Array.from(new Set(ids)) } },
		data: { status: "rebatched", rebatchedIntoOperationId: input.operationId },
	});
}

async function publishEvents(
	db: OperationDb,
	input: {
		operationId: number;
		actor: AdminMutationActor;
		demandItems: DemandItem[];
		allocations: MaterializedAllocation[];
		rollOvers: MaterializedRollOver[];
	},
) {
	await DomainEventPublisher.publishMany(db, [
		...input.demandItems.map((demand) => ({
			type: "operation.cartItem.included" as const,
			eventKey: `operation:${input.operationId}:cartItem:${demand.cartItemId}:source:${demand.sourceKey}:included`,
			aggregateType: "CartItem" as const,
			aggregateId: String(demand.cartItemId),
			actor: {
				source: "admin" as const,
				actorId: input.actor.id,
			},
			payload: {
				operationId: String(input.operationId),
				cartItemId: String(demand.cartItemId),
				cartId: String(demand.cartId),
				quantity: demand.quantity.toString(),
				metadata: {
					sourceKey: demand.sourceKey,
					...(demand.sourceRollOverId === undefined
						? {}
						: { sourceRollOverId: String(demand.sourceRollOverId) }),
					cartCode: demand.cartCode,
				},
			},
		})),
		...input.allocations.map((allocation) => ({
			type: "operation.cartItem.allocatedToLotItem" as const,
			eventKey: `operation:${input.operationId}:cartItem:${allocation.cartItemId}:lotItem:${allocation.lotItemId}:allocated`,
			aggregateType: "CartItem" as const,
			aggregateId: String(allocation.cartItemId),
			actor: {
				source: "admin" as const,
				actorId: input.actor.id,
			},
			payload: {
				operationId: String(input.operationId),
				cartItemId: String(allocation.cartItemId),
				cartId: String(allocation.cartId),
				lotId: String(allocation.lotId),
				lotItemId: String(allocation.lotItemId),
				quantity: allocation.quantity.toString(),
			},
		})),
		...input.rollOvers.map((rollOver) => ({
			type: "rollover.preAllocation.created" as const,
			eventKey: `operation:${input.operationId}:cartItem:${rollOver.cartItemId}:rollover:${rollOver.id}:created`,
			aggregateType: "RollOver" as const,
			aggregateId: String(rollOver.id),
			actor: {
				source: "admin" as const,
				actorId: input.actor.id,
			},
			payload: {
				operationId: String(input.operationId),
				rolloverId: String(rollOver.id),
				cartItemId: String(rollOver.cartItemId),
				cartId: String(rollOver.cartId),
				quantity: rollOver.quantity.toString(),
			},
		})),
	]);
}

function buildSummary(input: {
	demandItems: DemandItem[];
	assignments: ResolvedAssignment[];
	rollOvers: RollOverInput[];
	lotCount: number;
	supplierOrderCount: number;
}) {
	return {
		source: "operation.createAndExecute",
		version: "v1-fifo",
		generatedAt: new Date().toISOString(),
		demand: {
			itemCount: input.demandItems.length,
			quantity: sumDecimals(
				input.demandItems.map((item) => item.quantity),
			).toString(),
		},
		assigned: {
			itemCount: new Set(
				input.assignments.map((assignment) => assignment.demand.cartItemId),
			).size,
			quantity: sumDecimals(
				input.assignments.map((assignment) => assignment.assignedQuantity),
			).toString(),
		},
		rollOver: {
			itemCount: new Set(
				input.rollOvers.map((rollOver) => rollOver.demand.cartItemId),
			).size,
			quantity: sumDecimals(
				input.rollOvers.map((rollOver) => rollOver.quantity),
			).toString(),
			reasons: Array.from(
				input.rollOvers.reduce<Map<string, number>>((acc, rollOver) => {
					acc.set(rollOver.reason, (acc.get(rollOver.reason) ?? 0) + 1);
					return acc;
				}, new Map()),
			).map(([reason, count]) => ({ reason, count })),
		},
		outputs: {
			lotCount: input.lotCount,
			supplierOrderCount: input.supplierOrderCount,
		},
	};
}

/**
 * The execution body, joined to the caller's transaction. It opens none of its
 * own so a compound command — `operation.rerun`, which compensates and then
 * executes — can be atomic. `executeOperation` is the standalone entry point.
 */
export async function runOperationExecution(
	tx: OperationDb,
	input: OperationExecutionInput,
) {
	const operation = await validateOperation(tx, input.operationId);
	const destinationId = operation.destinationId;
	if (destinationId === null)
		throw new Error("Operation destination is required");
	const demandItems = await buildDemand(tx, operation);
	const resolved = resolveAssignments(demandItems, new Date());
	const materializedAssignments = await materializeAssignments(tx, {
		operationId: operation.id,
		destinationId,
		assignments: resolved.assignments,
	});
	const materializedRollOvers = await materializeRollOvers(tx, {
		operationId: operation.id,
		rollOvers: resolved.rollOvers,
	});

	await markAssignedSourceRollOversRebatched(tx, {
		operationId: operation.id,
		assignments: resolved.assignments,
	});

	const summary = buildSummary({
		demandItems,
		assignments: resolved.assignments,
		rollOvers: resolved.rollOvers,
		lotCount: materializedAssignments.lotCount,
		supplierOrderCount: materializedAssignments.supplierOrderCount,
	});

	await dbOperationComplete(tx, {
		operationId: operation.id,
		summary,
		eligibleQuantity: summary.demand.quantity,
		assignedQuantity: summary.assigned.quantity,
		rollOverQuantity: summary.rollOver.quantity,
		eligibleItemCount: summary.demand.itemCount,
		assignedItemCount: summary.assigned.itemCount,
		rollOverItemCount: summary.rollOver.itemCount,
		lotCount: summary.outputs.lotCount,
		supplierOrderCount: summary.outputs.supplierOrderCount,
	});

	await publishEvents(tx, {
		operationId: operation.id,
		actor: input.actor,
		demandItems,
		allocations: materializedAssignments.allocations,
		rollOvers: materializedRollOvers,
	});
}

export async function executeOperation(
	database: { $transaction: typeof import("~/server/db").db.$transaction },
	input: OperationExecutionInput,
) {
	await runSerializable(database, async (tx) => {
		await runOperationExecution(tx, input);
	});
}

async function dbOperationComplete(
	db: OperationDb,
	input: {
		operationId: number;
		summary: unknown;
		eligibleQuantity: string;
		assignedQuantity: string;
		rollOverQuantity: string;
		eligibleItemCount: number;
		assignedItemCount: number;
		rollOverItemCount: number;
		lotCount: number;
		supplierOrderCount: number;
	},
) {
	await db.operation.update({
		where: { id: input.operationId },
		data: {
			status: "completed",
			finishedAt: new Date(),
			failureReason: null,
			eligibleQuantity: input.eligibleQuantity,
			assignedQuantity: input.assignedQuantity,
			rollOverQuantity: input.rollOverQuantity,
			eligibleItemCount: input.eligibleItemCount,
			assignedItemCount: input.assignedItemCount,
			rollOverItemCount: input.rollOverItemCount,
			lotCount: input.lotCount,
			supplierOrderCount: input.supplierOrderCount,
			summary: toPrismaInputJson(input.summary),
		},
	});
}
