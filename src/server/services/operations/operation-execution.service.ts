import { Prisma } from "~/prisma/client";
import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import type { AdminMutationActor } from "~/server/services/admin/_base/admin-audit";
import { toPrismaInputJson } from "~/server/services/admin/_base/prisma-json";
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
				cartItemLotItems: { none: {} },
				rollOvers: { none: {} },
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

async function materializeAssignments(
	db: OperationDb,
	input: {
		operationId: number;
		destinationId: number;
		assignments: ResolvedAssignment[];
	},
) {
	const supplierOrderBySupplierId = new Map<
		number,
		{ id: number; code: string }
	>();
	const lotBySupplierId = new Map<number, { id: number; code: string }>();
	const lotItemByKey = new Map<string, { id: number; code: string }>();
	const allocationByKey = new Map<
		string,
		{
			cartItemId: number;
			cartId: number;
			lotItemId: number;
			quantity: Prisma.Decimal;
		}
	>();

	for (const assignment of input.assignments) {
		const supplierId = assignment.supplierTerm.supplierId;

		let supplierOrder = supplierOrderBySupplierId.get(supplierId);
		if (!supplierOrder) {
			supplierOrder = await db.supplierOrder.create({
				data: {
					code: buildCode("SORD-OP", input.operationId),
					supplierId,
					status: "pending",
					metadata: toPrismaInputJson({
						source: "operation.createAndExecute",
						operationId: String(input.operationId),
					}),
				},
				select: { id: true, code: true },
			});
			supplierOrderBySupplierId.set(supplierId, supplierOrder);
		}

		let lot = lotBySupplierId.get(supplierId);
		if (!lot) {
			lot = await db.lot.create({
				data: {
					code: buildCode("LOT-OP", input.operationId),
					status: "assembling",
					operationId: input.operationId,
					supplierId,
					supplierOrderId: supplierOrder.id,
				},
				select: { id: true, code: true },
			});
			lotBySupplierId.set(supplierId, lot);
		}

		const key = assignmentKey({
			supplierId,
			productSupplierTermsId: assignment.supplierTerm.id,
			destinationId: input.destinationId,
		});
		let lotItem = lotItemByKey.get(key);
		if (!lotItem) {
			lotItem = await db.lotItem.create({
				data: {
					code: buildCode("LITEM-OP", input.operationId),
					status: "pending",
					lotId: lot.id,
					supplierId,
					destinationId: input.destinationId,
					productSupplierTermsId: assignment.supplierTerm.id,
					quantity: assignment.assignedQuantity.toString(),
				},
				select: { id: true, code: true },
			});
			lotItemByKey.set(key, lotItem);
		} else {
			await db.lotItem.update({
				where: { id: lotItem.id },
				data: {
					quantity: { increment: assignment.assignedQuantity.toString() },
				},
			});
		}

		const allocationKey = `${assignment.demand.cartItemId}:${lotItem.id}`;
		const currentAllocation = allocationByKey.get(allocationKey);
		if (!currentAllocation) {
			allocationByKey.set(allocationKey, {
				cartItemId: assignment.demand.cartItemId,
				cartId: assignment.demand.cartId,
				lotItemId: lotItem.id,
				quantity: assignment.assignedQuantity,
			});
			continue;
		}

		currentAllocation.quantity = currentAllocation.quantity.plus(
			assignment.assignedQuantity,
		);
	}

	const allocations: MaterializedAllocation[] = [];
	for (const allocation of allocationByKey.values()) {
		const created = await db.cartItemLotItem.create({
			data: {
				cartItemId: allocation.cartItemId,
				lotItemId: allocation.lotItemId,
				quantity: allocation.quantity.toString(),
			},
			select: {
				id: true,
				cartItemId: true,
				quantity: true,
				lotItem: {
					select: {
						id: true,
						lotId: true,
					},
				},
			},
		});

		allocations.push({
			cartItemId: created.cartItemId,
			cartId: allocation.cartId,
			cartItemLotItemId: created.id,
			lotId: created.lotItem.lotId,
			lotItemId: created.lotItem.id,
			quantity: created.quantity,
		});
	}

	return {
		allocations,
		lotCount: lotBySupplierId.size,
		supplierOrderCount: supplierOrderBySupplierId.size,
	};
}

async function materializeRollOvers(
	db: OperationDb,
	input: {
		operationId: number;
		rollOvers: RollOverInput[];
	},
) {
	const createdRollOvers: MaterializedRollOver[] = [];
	const includedSourceRollOverIds = new Set<number>();

	for (const rollOver of input.rollOvers) {
		if (!isPositive(rollOver.quantity)) continue;
		if (rollOver.demand.sourceRollOverId !== undefined) {
			includedSourceRollOverIds.add(rollOver.demand.sourceRollOverId);
		}

		const created = await db.rollOver.create({
			data: {
				cartItemId: rollOver.demand.cartItemId,
				operationId: input.operationId,
				stage: "preAllocation",
				status: "open",
				quantity: rollOver.quantity.toString(),
				reason: rollOver.reason,
			},
			select: {
				id: true,
				cartItemId: true,
				quantity: true,
				cartItem: {
					select: {
						cartId: true,
					},
				},
			},
		});

		createdRollOvers.push({
			id: created.id,
			cartItemId: created.cartItemId,
			cartId: created.cartItem.cartId,
			quantity: created.quantity,
		});
	}

	const assignedSourceRollOverIds = input.rollOvers
		.map((rollOver) => rollOver.demand.sourceRollOverId)
		.filter((id): id is number => id !== undefined);
	for (const id of assignedSourceRollOverIds) includedSourceRollOverIds.add(id);

	if (includedSourceRollOverIds.size > 0) {
		await db.rollOver.updateMany({
			where: { id: { in: Array.from(includedSourceRollOverIds) } },
			data: { status: "rebatched" },
		});
	}

	return createdRollOvers;
}

async function markAssignedSourceRollOversRebatched(
	db: OperationDb,
	assignments: ResolvedAssignment[],
) {
	const ids = assignments
		.map((assignment) => assignment.demand.sourceRollOverId)
		.filter((id): id is number => id !== undefined);
	if (ids.length === 0) return;

	await db.rollOver.updateMany({
		where: { id: { in: Array.from(new Set(ids)) } },
		data: { status: "rebatched" },
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

export async function executeOperation(
	database: { $transaction: typeof import("~/server/db").db.$transaction },
	input: OperationExecutionInput,
) {
	await database.$transaction(
		async (tx) => {
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

			await markAssignedSourceRollOversRebatched(tx, resolved.assignments);

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
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
		},
	);
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
