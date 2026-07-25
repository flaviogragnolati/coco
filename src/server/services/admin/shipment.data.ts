import type { Prisma } from "~/prisma/client";
import type { ShipmentListInput } from "~/shared/common/admin-crud/shipment.types";
import { fromDateTimeLocalValue } from "~/shared/common/date.helpers";

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
