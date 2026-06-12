import type { Prisma } from "~/prisma/client";
import type { ShipmentListInput } from "~/shared/common/admin-crud/shipment.types";

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
		and.push({ createdAt: { gte: new Date(input.createdFrom) } });
	}
	if (input.createdTo !== undefined) {
		and.push({ createdAt: { lte: new Date(input.createdTo) } });
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
) {
	return db.shipment.findMany({
		where: buildShipmentWhere(input),
		select: shipmentDetailSelect,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
	});
}

export async function findShipmentById(db: AdminDbClient, id: number) {
	return db.shipment.findUnique({
		where: { id },
		select: shipmentDetailSelect,
	});
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
