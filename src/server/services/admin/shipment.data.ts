import type { Prisma } from "~/prisma/client";
import type { ShipmentListInput } from "~/shared/common/admin-crud/shipment.types";
import { fromDateTimeLocalValue } from "~/shared/common/date.helpers";
import { toPrismaInputJson } from "./_base/prisma-json";

type AdminDbClient = Prisma.TransactionClient;

const shipmentTrackingEventSelect = {
	id: true,
	eventType: true,
	source: true,
	cartItemId: true,
	quantity: true,
	createdAt: true,
	cartItem: {
		select: {
			code: true,
		},
	},
} satisfies Prisma.CartItemTrackingEventSelect;

const shipmentDetailSelect = {
	id: true,
	name: true,
	internalCode: true,
	trackingCode: true,
	type: true,
	deliveryMode: true,
	status: true,
	destinationAddressSnapshot: true,
	destinationContactSnapshot: true,
	createdAt: true,
	updatedAt: true,
	carrierOrder: {
		select: {
			id: true,
			code: true,
			externalReference: true,
			status: true,
			carrier: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	},
	packages: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			name: true,
			trackingCode: true,
			status: true,
			leg: true,
			packageLotItems: {
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				select: {
					id: true,
					status: true,
					quantity: true,
					lotItemId: true,
					lotItem: {
						select: {
							code: true,
							productSupplierTerms: {
								select: {
									product: {
										select: {
											name: true,
										},
									},
								},
							},
						},
					},
					packageAllocations: {
						select: {
							id: true,
							quantity: true,
							cartItemLotItem: {
								select: {
									cartItem: {
										select: {
											id: true,
											code: true,
											cart: {
												select: {
													user: {
														select: {
															name: true,
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
	},
} satisfies Prisma.ShipmentSelect;

export type ShipmentDetailRecord = Prisma.ShipmentGetPayload<{
	select: typeof shipmentDetailSelect;
}>;

const shipmentSummarySelect = {
	id: true,
	internalCode: true,
	name: true,
	type: true,
	deliveryMode: true,
	status: true,
	trackingCode: true,
	createdAt: true,
	updatedAt: true,
	carrierOrder: {
		select: {
			id: true,
			code: true,
			externalReference: true,
			status: true,
			carrier: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	},
	packages: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			status: true,
			packageLotItems: {
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				select: {
					status: true,
					quantity: true,
					packageAllocations: {
						select: {
							quantity: true,
						},
					},
				},
			},
		},
	},
} satisfies Prisma.ShipmentSelect;

export type ShipmentSummaryRecord = Prisma.ShipmentGetPayload<{
	select: typeof shipmentSummarySelect;
}>;

export type ShipmentTrackingEventRecord =
	Prisma.CartItemTrackingEventGetPayload<{
		select: typeof shipmentTrackingEventSelect;
	}>;

function buildShipmentWhere(
	input: ShipmentListInput,
): Prisma.ShipmentWhereInput {
	const and: Prisma.ShipmentWhereInput[] = [];

	if (input.shipmentId !== undefined) and.push({ id: input.shipmentId });
	if (input.status !== undefined) and.push({ status: input.status });
	if (input.type !== undefined) and.push({ type: input.type });
	if (input.carrierOrderId !== undefined) {
		and.push({ carrierOrderId: input.carrierOrderId });
	}
	if (input.unassigned === true) and.push({ carrierOrderId: null });
	if (input.carrierId !== undefined) {
		and.push({ carrierOrder: { carrierId: input.carrierId } });
	}
	if (input.trackingCode !== undefined) {
		and.push({ trackingCode: { contains: input.trackingCode } });
	}
	if (input.createdFrom !== undefined) {
		and.push({ createdAt: { gte: fromDateTimeLocalValue(input.createdFrom) } });
	}
	if (input.createdTo !== undefined) {
		and.push({ createdAt: { lte: fromDateTimeLocalValue(input.createdTo) } });
	}
	if (input.search !== undefined) {
		and.push({
			OR: [
				{ internalCode: { contains: input.search } },
				{ name: { contains: input.search } },
				{ trackingCode: { contains: input.search } },
				{ carrierOrder: { code: { contains: input.search } } },
				{ carrierOrder: { carrier: { name: { contains: input.search } } } },
			],
		});
	}

	return and.length > 0 ? { AND: and } : {};
}

export async function listShipmentCandidates(
	db: AdminDbClient,
	input: ShipmentListInput,
	options?: { skip?: number; take?: number },
) {
	const direction = input.sortDirection;

	return db.shipment.findMany({
		where: buildShipmentWhere(input),
		select: shipmentSummarySelect,
		orderBy: [{ createdAt: direction }, { id: direction }],
		skip: options?.skip,
		take: options?.take,
	});
}

export async function countShipmentCandidates(
	db: AdminDbClient,
	input: ShipmentListInput,
) {
	return db.shipment.count({ where: buildShipmentWhere(input) });
}

export async function getShipmentStats(db: AdminDbClient) {
	const [total, byStatus, byType, packageCount, transportedQuantity] =
		await Promise.all([
			db.shipment.count(),
			db.shipment.groupBy({ by: ["status"], _count: { _all: true } }),
			db.shipment.groupBy({ by: ["type"], _count: { _all: true } }),
			db.package.count({ where: { shipmentId: { not: null } } }),
			db.packageLotItem.aggregate({
				_sum: { quantity: true },
				where: { package: { shipmentId: { not: null } } },
			}),
		]);

	return {
		total,
		byStatus,
		byType,
		packageCount,
		transportedQuantity: transportedQuantity._sum.quantity,
	};
}

export async function findShipmentById(db: AdminDbClient, id: number) {
	return db.shipment.findUnique({
		where: { id },
		select: shipmentDetailSelect,
	});
}

export async function listShipmentsByIds(
	db: AdminDbClient,
	ids: number[],
): Promise<ShipmentDetailRecord[]> {
	if (ids.length === 0) return [];

	return db.shipment.findMany({
		where: { id: { in: ids } },
		select: shipmentDetailSelect,
	});
}

/**
 * The command shape for the ladder-only moves (`dispatch`, `markDelayed`,
 * `markFailed`, `retry`): the packages, their lines, and each line's demand down
 * to `cartId`, which every event payload carries. Deliberately narrower than
 * `shipmentReceiveSelect` — none of these commands absorbs anything, so none of
 * them needs payment dates.
 */
const shipmentCommandSelect = {
	id: true,
	name: true,
	internalCode: true,
	trackingCode: true,
	type: true,
	deliveryMode: true,
	status: true,
	packages: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			name: true,
			status: true,
			leg: true,
			packageLotItems: {
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				select: {
					id: true,
					status: true,
					quantity: true,
					lotItemId: true,
					packageAllocations: {
						select: {
							id: true,
							quantity: true,
							cartItemLotItem: {
								select: {
									id: true,
									quantity: true,
									cartItem: { select: { id: true, code: true, cartId: true } },
								},
							},
						},
					},
				},
			},
		},
	},
} satisfies Prisma.ShipmentSelect;

export type ShipmentCommandRecord = Prisma.ShipmentGetPayload<{
	select: typeof shipmentCommandSelect;
}>;

/**
 * The receive shape: `shipmentCommandSelect` widened with the payment dates the
 * shortfall absorption orders by, and with the lot each line belongs to so a roll
 * over attaches to that lot's own operation rather than to a "current" one.
 */
const shipmentReceiveSelect = {
	...shipmentCommandSelect,
	packages: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			name: true,
			status: true,
			leg: true,
			packageLotItems: {
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				select: {
					id: true,
					status: true,
					quantity: true,
					lotItemId: true,
					lotItem: {
						select: {
							id: true,
							code: true,
							status: true,
							quantity: true,
							lot: {
								select: {
									id: true,
									status: true,
									operationId: true,
									supplierOrderId: true,
								},
							},
						},
					},
					packageAllocations: {
						orderBy: [{ createdAt: "asc" }, { id: "asc" }],
						select: {
							id: true,
							quantity: true,
							cartItemLotItem: {
								select: {
									id: true,
									quantity: true,
									cartItem: {
										select: {
											id: true,
											code: true,
											cartId: true,
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
																orderBy: [
																	{ completedAt: "asc" },
																	{ id: "asc" },
																],
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
		},
	},
} satisfies Prisma.ShipmentSelect;

export type ShipmentReceiveRecord = Prisma.ShipmentGetPayload<{
	select: typeof shipmentReceiveSelect;
}>;

export async function findShipmentForCommand(db: AdminDbClient, id: number) {
	return db.shipment.findUnique({
		where: { id },
		select: shipmentCommandSelect,
	});
}

export async function findShipmentForReceipt(db: AdminDbClient, id: number) {
	return db.shipment.findUnique({
		where: { id },
		select: shipmentReceiveSelect,
	});
}

/**
 * The only shipment constructor. `type`, `deliveryMode` and `status` are taken
 * explicitly rather than hardcoded so `retry` can reproduce its source's shape:
 * hardcoding `internalTransfer` here is what silently turned a retried end-user
 * shipment into an internal one.
 *
 * The P2002 collision on `internalCode` stays with the callers — the operator
 * message is command-specific.
 */
export async function createShipment(
	db: AdminDbClient,
	data: {
		name: string;
		internalCode: string;
		trackingCode?: string;
		type: Prisma.ShipmentCreateInput["type"];
		deliveryMode?: Prisma.ShipmentCreateInput["deliveryMode"];
		status: Prisma.ShipmentCreateInput["status"];
		destinationAddressSnapshot?: Record<string, unknown>;
		destinationContactSnapshot?: Record<string, unknown>;
	},
) {
	return db.shipment.create({
		data: {
			name: data.name,
			internalCode: data.internalCode,
			trackingCode: data.trackingCode,
			type: data.type,
			deliveryMode: data.deliveryMode,
			status: data.status,
			destinationAddressSnapshot:
				data.destinationAddressSnapshot === undefined
					? undefined
					: toPrismaInputJson(data.destinationAddressSnapshot),
			destinationContactSnapshot:
				data.destinationContactSnapshot === undefined
					? undefined
					: toPrismaInputJson(data.destinationContactSnapshot),
		},
		select: { id: true, internalCode: true },
	});
}

export async function updateShipmentState(
	db: AdminDbClient,
	id: number,
	data: {
		status?: Prisma.ShipmentUpdateInput["status"];
		trackingCode?: string;
	},
) {
	await db.shipment.update({
		where: { id },
		data: { status: data.status, trackingCode: data.trackingCode },
	});
}

const carrierOrderAssignmentSelect = {
	id: true,
	internalCode: true,
	name: true,
	type: true,
	status: true,
	carrierOrderId: true,
} satisfies Prisma.ShipmentSelect;

export type ShipmentCarrierOrderAssignmentRecord = Prisma.ShipmentGetPayload<{
	select: typeof carrierOrderAssignmentSelect;
}>;

export async function findShipmentsForCarrierOrderAssignment(
	db: AdminDbClient,
	ids: number[],
): Promise<ShipmentCarrierOrderAssignmentRecord[]> {
	if (ids.length === 0) return [];

	return db.shipment.findMany({
		where: { id: { in: ids } },
		select: carrierOrderAssignmentSelect,
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
	});
}

/**
 * Point shipments at a carrier order, or detach them with `null`. The FK lives on
 * `Shipment`, so its write lives here — the rule `reassignPackagesToShipment`
 * sets. The assignability guard belongs to the carrier order service.
 */
export async function reassignShipmentsToCarrierOrder(
	db: AdminDbClient,
	shipmentIds: number[],
	carrierOrderId: number | null,
) {
	if (shipmentIds.length === 0) return;

	await db.shipment.updateMany({
		where: { id: { in: shipmentIds } },
		data: { carrierOrderId },
	});
}

export async function listShipmentIdsWithTrackingEvents(
	db: AdminDbClient,
	shipmentIds: number[],
): Promise<Set<number>> {
	if (shipmentIds.length === 0) return new Set();

	const records = await db.cartItemTrackingEvent.findMany({
		where: { shipmentId: { in: shipmentIds } },
		select: { shipmentId: true },
		distinct: ["shipmentId"],
	});

	return new Set(
		records
			.map((record) => record.shipmentId)
			.filter((id): id is number => id !== null),
	);
}

export async function listLatestShipmentTrackingEvents(
	db: AdminDbClient,
	shipmentId: number,
) {
	const records = await db.cartItemTrackingEvent.findMany({
		where: { shipmentId },
		select: shipmentTrackingEventSelect,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: 5,
	});

	return records as ShipmentTrackingEventRecord[];
}
