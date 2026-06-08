import { Prisma } from "~/prisma/client";
import type {
	OperationCreateInput,
	OperationListInput,
} from "~/shared/common/admin-crud/operation.types";
import { toPrismaInputJson } from "./_base/prisma-json";

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

export type OperationListRecord = Prisma.OperationGetPayload<{
	select: typeof operationListSelect;
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

function toListItem(record: OperationListRecord) {
	return {
		...record,
		eligibleQuantity: record.eligibleQuantity.toString(),
		assignedQuantity: record.assignedQuantity.toString(),
		rollOverQuantity: record.rollOverQuantity.toString(),
	};
}

function toDetail(record: OperationDetailRecord) {
	const supplierOrders = Array.from(
		new Map(
			record.lots
				.map((lot) => lot.supplierOrder)
				.filter((order): order is NonNullable<typeof order> => order !== null)
				.map((order) => [order.id, order]),
		).values(),
	).sort((left, right) => left.id - right.id);

	return {
		...toListItem(record),
		summary: record.summary,
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

export async function listOperations(
	db: AdminDbClient,
	input: OperationListInput,
) {
	const records = await db.operation.findMany({
		where: buildOperationWhere(input),
		select: operationListSelect,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
	});

	return records.map(toListItem);
}

export async function findOperationById(db: AdminDbClient, id: number) {
	const record = await db.operation.findUnique({
		where: { id },
		select: operationDetailSelect,
	});

	return record ? toDetail(record) : null;
}

export async function getOperationStats(db: AdminDbClient) {
	const [total, running, completed, failed, aggregate] = await Promise.all([
		db.operation.count(),
		db.operation.count({ where: { status: "running" } }),
		db.operation.count({ where: { status: "completed" } }),
		db.operation.count({ where: { status: "failed" } }),
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
		running,
		completed,
		failed,
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
			from: new Date(input.from),
			to: new Date(input.to),
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
