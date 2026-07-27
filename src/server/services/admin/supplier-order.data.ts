import type {
	LotItemStatus,
	LotStatus,
	SupplierOrderStatus,
} from "~/prisma/client";
import { Prisma } from "~/prisma/client";
import type { SupplierOrderListInput } from "~/shared/common/admin-crud/supplier-order.types";
import { toPrismaInputJson } from "./_base/prisma-json";

type AdminDbClient = Prisma.TransactionClient;

const userSummarySelect = {
	id: true,
	name: true,
	email: true,
	deleted: true,
} satisfies Prisma.UserSelect;

const supplierSummarySelect = {
	id: true,
	name: true,
	active: true,
	deleted: true,
} satisfies Prisma.SupplierSelect;

const destinationSummarySelect = {
	id: true,
	name: true,
	active: true,
	deleted: true,
} satisfies Prisma.DestinationSelect;

const operationSummarySelect = {
	id: true,
	code: true,
	status: true,
} satisfies Prisma.OperationSelect;

const supplierOrderScalarSelect = {
	id: true,
	code: true,
	externalReference: true,
	status: true,
	requestedAt: true,
	confirmedAt: true,
	cancelledAt: true,
	createdAt: true,
	updatedAt: true,
} satisfies Prisma.SupplierOrderSelect;

/**
 * The inbound packaged quantity behind a lot line. Read by both the summary and
 * the detail selects: the dispatch guard, the `cancel` guard and the
 * `supplierOrder.*` diagnostics all measure the same thing, so they must read
 * the same branch (A10 — dispatched quantity is derived, never stored).
 */
const packageLineSelect = {
	id: true,
	status: true,
	quantity: true,
	package: { select: { status: true, leg: true } },
} satisfies Prisma.PackageLotItemSelect;

/**
 * The relations the diagnostic rules and the list summary read. The detail
 * select below is a structural superset, so both can feed
 * `calculateSupplierOrderDiagnostics` and a row's diagnostic count always
 * matches what the modal shows.
 */
const supplierOrderSummarySelect = {
	...supplierOrderScalarSelect,
	supplier: { select: supplierSummarySelect },
	lots: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			status: true,
			operation: { select: operationSummarySelect },
			lotItems: {
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				select: {
					id: true,
					status: true,
					quantity: true,
					packageLotItems: { select: packageLineSelect },
					cartItemLotItems: {
						select: {
							id: true,
							quantity: true,
							cartItem: { select: { id: true, fulfillmentStatus: true } },
						},
					},
				},
			},
		},
	},
} satisfies Prisma.SupplierOrderSelect;

export type SupplierOrderSummaryRecord = Prisma.SupplierOrderGetPayload<{
	select: typeof supplierOrderSummarySelect;
}>;

const supplierOrderDetailSelect = {
	...supplierOrderScalarSelect,
	supplier: { select: supplierSummarySelect },
	lots: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			code: true,
			status: true,
			operation: { select: operationSummarySelect },
			lotItems: {
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				select: {
					id: true,
					code: true,
					status: true,
					quantity: true,
					packageLotItems: { select: packageLineSelect },
					destination: { select: destinationSummarySelect },
					productSupplierTerms: {
						select: {
							product: { select: { id: true, name: true, unit: true } },
						},
					},
					cartItemLotItems: {
						orderBy: [{ createdAt: "asc" }, { id: "asc" }],
						select: {
							id: true,
							quantity: true,
							createdAt: true,
							// How much of this allocation a previous dispatch already covers.
							// A second dispatch serves what the first left uncovered (A15).
							packageAllocations: {
								select: {
									quantity: true,
									packageLotItem: {
										select: {
											status: true,
											package: { select: { status: true, leg: true } },
										},
									},
								},
							},
							cartItem: {
								select: {
									id: true,
									code: true,
									fulfillmentStatus: true,
									cart: {
										select: {
											id: true,
											code: true,
											user: { select: userSummarySelect },
										},
									},
									userOrderItems: {
										orderBy: [{ createdAt: "asc" }, { id: "asc" }],
										select: {
											createdAt: true,
											userOrder: {
												select: {
													transactions: {
														where: {
															status: "completed",
															completedAt: { not: null },
														},
														orderBy: [{ completedAt: "asc" }, { id: "asc" }],
														select: { completedAt: true },
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
		},
	},
} satisfies Prisma.SupplierOrderSelect;

export type SupplierOrderDetailRecord = Prisma.SupplierOrderGetPayload<{
	select: typeof supplierOrderDetailSelect;
}>;

/**
 * Command shape: the detail select plus `cartId` on each allocation's cart item,
 * which the effects handlers need to build event payloads. Reusing the detail
 * select keeps the absorption candidates identical to the ones the operator saw.
 */
const supplierOrderCommandSelect = supplierOrderDetailSelect;

export type SupplierOrderCommandRecord = SupplierOrderDetailRecord;

/**
 * Only the payment trail, so every command loader that carries it can order
 * demand — the supplier order's own selects, and the shipment and package
 * command selects.
 */
type AllocationCartItemRecord = {
	userOrderItems: Array<{
		createdAt: Date;
		userOrder: { transactions: Array<{ completedAt: Date | null }> };
	}>;
};

function minDate(values: Date[]) {
	return values.reduce<Date | null>((earliest, value) => {
		if (earliest === null || value < earliest) return value;
		return earliest;
	}, null);
}

/**
 * When the customer paid for this demand: the earliest completed transaction on
 * any of the cart item's user orders. Same rule `listOpenRollOverDemand` uses to
 * order demand into an operation, read here to order it back out of one.
 */
export function resolveAllocationPaidAt(
	cartItem: AllocationCartItemRecord,
): Date | null {
	return minDate(
		cartItem.userOrderItems.flatMap((orderItem) =>
			orderItem.userOrder.transactions
				.map((transaction) => transaction.completedAt)
				.filter((value): value is Date => value !== null),
		),
	);
}

export function resolveAllocationOrderItemCreatedAt(
	cartItem: AllocationCartItemRecord,
): Date | null {
	return cartItem.userOrderItems[0]?.createdAt ?? null;
}

type PackageLineRecord = Prisma.PackageLotItemGetPayload<{
	select: typeof packageLineSelect;
}>;

/**
 * How much of a lot line already sits in a live inbound package. Only the
 * inbound leg counts: outbound packages are fractionated *from* received goods,
 * so counting them would double-charge the same quantity against the line
 * (ADR 0004, per-leg conservation).
 */
export function packagedQuantity(lotItem: {
	packageLotItems: PackageLineRecord[];
}): Prisma.Decimal {
	return lotItem.packageLotItems
		.filter(
			(line) =>
				line.package.leg === "inbound" &&
				line.package.status !== "cancelled" &&
				line.status !== "cancelled",
		)
		.reduce<Prisma.Decimal>(
			(total, line) => total.plus(line.quantity),
			new Prisma.Decimal(0),
		);
}

/**
 * The one definition of a live supplier-order line, shared by the command
 * service, the diagnostics and the lot surface: a line is live when neither it
 * nor its lot is cancelled.
 */
export function isLiveSupplierOrderLine(
	lot: { status: LotStatus },
	lotItem: { status: LotItemStatus },
) {
	return lot.status !== "cancelled" && lotItem.status !== "cancelled";
}

/** What is still outstanding for dispatch, floored at 0. */
export function remainingQuantity(lotItem: {
	quantity: Prisma.Decimal;
	packageLotItems: PackageLineRecord[];
}): Prisma.Decimal {
	const remaining = lotItem.quantity.minus(packagedQuantity(lotItem));
	return remaining.lessThan(0) ? new Prisma.Decimal(0) : remaining;
}

function buildSupplierOrderWhere(
	input: SupplierOrderListInput,
): Prisma.SupplierOrderWhereInput {
	const and: Prisma.SupplierOrderWhereInput[] = [];

	if (input.status !== undefined) and.push({ status: input.status });
	if (input.supplierId !== undefined)
		and.push({ supplierId: input.supplierId });
	if (input.operationId !== undefined) {
		and.push({ lots: { some: { operationId: input.operationId } } });
	}
	if (input.search !== undefined) {
		and.push({
			OR: [
				{ code: { contains: input.search } },
				{ externalReference: { contains: input.search } },
				{ supplier: { name: { contains: input.search } } },
				{ lots: { some: { code: { contains: input.search } } } },
				{
					lots: {
						some: { operation: { code: { contains: input.search } } },
					},
				},
			],
		});
	}

	return and.length > 0 ? { AND: and } : {};
}

export async function listSupplierOrderCandidates(
	db: AdminDbClient,
	input: SupplierOrderListInput,
	options?: { skip?: number; take?: number },
) {
	const direction = input.sortDirection;

	return db.supplierOrder.findMany({
		where: buildSupplierOrderWhere(input),
		select: supplierOrderSummarySelect,
		orderBy: [{ createdAt: direction }, { id: direction }],
		skip: options?.skip,
		take: options?.take,
	});
}

export async function countSupplierOrderCandidates(
	db: AdminDbClient,
	input: SupplierOrderListInput,
) {
	return db.supplierOrder.count({ where: buildSupplierOrderWhere(input) });
}

export async function findSupplierOrderById(db: AdminDbClient, id: number) {
	return db.supplierOrder.findUnique({
		where: { id },
		select: supplierOrderDetailSelect,
	});
}

export async function findSupplierOrderForCommand(
	db: AdminDbClient,
	id: number,
) {
	return db.supplierOrder.findUnique({
		where: { id },
		select: supplierOrderCommandSelect,
	});
}

export async function getSupplierOrderStats(db: AdminDbClient) {
	const [total, byStatus, lotItemQuantity, openLineCount] = await Promise.all([
		db.supplierOrder.count(),
		db.supplierOrder.groupBy({ by: ["status"], _count: { _all: true } }),
		db.lotItem.aggregate({
			_sum: { quantity: true },
			where: { lot: { supplierOrderId: { not: null } } },
		}),
		db.lotItem.count({
			where: {
				status: { in: ["pending", "requested"] },
				lot: { supplierOrderId: { not: null } },
			},
		}),
	]);

	return {
		total,
		byStatus,
		lotItemQuantity: lotItemQuantity._sum.quantity,
		openLineCount,
	};
}

export async function updateSupplierOrderState(
	db: AdminDbClient,
	id: number,
	data: {
		status?: Prisma.SupplierOrderUpdateInput["status"];
		requestedAt?: Date;
		confirmedAt?: Date;
		cancelledAt?: Date;
		externalReference?: string;
		metadata?: Record<string, unknown>;
	},
) {
	await db.supplierOrder.update({
		where: { id },
		data: {
			status: data.status,
			requestedAt: data.requestedAt,
			confirmedAt: data.confirmedAt,
			cancelledAt: data.cancelledAt,
			externalReference: data.externalReference,
			metadata:
				data.metadata === undefined
					? undefined
					: toPrismaInputJson(data.metadata),
		},
	});
}

export async function updateLotStatuses(
	db: AdminDbClient,
	lotIds: number[],
	status: Prisma.LotUpdateManyMutationInput["status"],
) {
	if (lotIds.length === 0) return;

	await db.lot.updateMany({ where: { id: { in: lotIds } }, data: { status } });
}

export async function updateLotItemStatuses(
	db: AdminDbClient,
	lotItemIds: number[],
	status: Prisma.LotItemUpdateManyMutationInput["status"],
) {
	if (lotItemIds.length === 0) return;

	await db.lotItem.updateMany({
		where: { id: { in: lotItemIds } },
		data: { status },
	});
}

export async function updateLotItemState(
	db: AdminDbClient,
	lotItemId: number,
	data: {
		status?: Prisma.LotItemUpdateInput["status"];
		quantity?: Prisma.Decimal;
	},
) {
	await db.lotItem.update({
		where: { id: lotItemId },
		data: {
			status: data.status,
			quantity: data.quantity?.toString(),
		},
	});
}

export async function updateAllocationQuantity(
	db: AdminDbClient,
	allocationId: number,
	quantity: Prisma.Decimal,
) {
	await db.cartItemLotItem.update({
		where: { id: allocationId },
		data: { quantity: quantity.toString() },
	});
}

/**
 * The four order-wide facts `supplierOrderAvailableActions` needs, keyed by
 * order id. Read here rather than by widening `lotSummarySelect`, which feeds the
 * lots list: the inputs span *all* an order's lots, so one query per distinct
 * order across a page costs a fraction of a nested read per row.
 */
export type SupplierOrderActionInputs = {
	status: SupplierOrderStatus;
	operationCompleted: boolean;
	liveLineCount: number;
	dispatchableQuantity: string;
};

const supplierOrderActionSelect = {
	id: true,
	status: true,
	lots: {
		select: {
			status: true,
			operation: { select: { status: true } },
			lotItems: {
				select: {
					status: true,
					quantity: true,
					packageLotItems: { select: packageLineSelect },
				},
			},
		},
	},
} satisfies Prisma.SupplierOrderSelect;

export async function findSupplierOrderActionInputs(
	db: AdminDbClient,
	ids: number[],
): Promise<Map<number, SupplierOrderActionInputs>> {
	if (ids.length === 0) return new Map();

	const records = await db.supplierOrder.findMany({
		where: { id: { in: ids } },
		select: supplierOrderActionSelect,
	});

	return new Map(
		records.map((record) => {
			const liveLines = record.lots.flatMap((lot) =>
				lot.lotItems
					.filter((lotItem) => isLiveSupplierOrderLine(lot, lotItem))
					.map((lotItem) => lotItem),
			);

			return [
				record.id,
				{
					status: record.status,
					// Matches `toDetail`: an order with no lots cannot claim a completed
					// origin, so `request` stays disabled rather than vacuously enabled.
					operationCompleted:
						record.lots.length > 0 &&
						record.lots.every((lot) => lot.operation.status === "completed"),
					liveLineCount: liveLines.length,
					dispatchableQuantity: liveLines
						.reduce(
							(total, lotItem) => total.plus(remainingQuantity(lotItem)),
							new Prisma.Decimal(0),
						)
						.toString(),
				},
			];
		}),
	);
}
