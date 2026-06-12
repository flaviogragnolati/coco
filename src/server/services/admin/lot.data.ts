import type { Prisma } from "~/prisma/client";
import type { LotListInput } from "~/shared/common/admin-crud/lot.types";

type AdminDbClient = Prisma.TransactionClient;

const userSummarySelect = {
	id: true,
	name: true,
	email: true,
	deleted: true,
} satisfies Prisma.UserSelect;

const lotTrackingEventSelect = {
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

const lotDetailSelect = {
	id: true,
	code: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	operation: {
		select: {
			id: true,
			code: true,
			status: true,
			rollOvers: {
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				select: {
					id: true,
					stage: true,
					status: true,
					quantity: true,
					reason: true,
					cartItemId: true,
					cartItem: {
						select: {
							code: true,
						},
					},
				},
			},
		},
	},
	supplier: {
		select: {
			id: true,
			name: true,
			active: true,
			deleted: true,
		},
	},
	supplierOrder: {
		select: {
			id: true,
			code: true,
			externalReference: true,
			status: true,
		},
	},
	lotItems: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			code: true,
			status: true,
			quantity: true,
			destination: {
				select: {
					id: true,
					name: true,
					active: true,
					deleted: true,
				},
			},
			productSupplierTerms: {
				select: {
					product: {
						select: {
							id: true,
							name: true,
							unit: true,
						},
					},
				},
			},
			packageLotItems: {
				select: {
					quantity: true,
					packageAllocations: {
						select: {
							quantity: true,
						},
					},
				},
			},
			cartItemLotItems: {
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				select: {
					id: true,
					quantity: true,
					packageAllocations: {
						select: {
							quantity: true,
						},
					},
					cartItem: {
						select: {
							id: true,
							code: true,
							quantity: true,
							status: true,
							fulfillmentStatus: true,
							cart: {
								select: {
									id: true,
									code: true,
									user: {
										select: userSummarySelect,
									},
								},
							},
						},
					},
				},
			},
		},
	},
} satisfies Prisma.LotSelect;

export type LotDetailRecord = Prisma.LotGetPayload<{
	select: typeof lotDetailSelect;
}>;

export type LotTrackingEventRecord = Prisma.CartItemTrackingEventGetPayload<{
	select: typeof lotTrackingEventSelect;
}>;

function buildLotWhere(input: LotListInput): Prisma.LotWhereInput {
	const and: Prisma.LotWhereInput[] = [];

	if (input.lotId !== undefined) and.push({ id: input.lotId });
	if (input.status !== undefined) and.push({ status: input.status });
	if (input.operationId !== undefined)
		and.push({ operationId: input.operationId });
	if (input.supplierId !== undefined)
		and.push({ supplierId: input.supplierId });
	if (input.supplierOrderId !== undefined) {
		and.push({ supplierOrderId: input.supplierOrderId });
	}
	if (input.lotItemId !== undefined) {
		and.push({ lotItems: { some: { id: input.lotItemId } } });
	}
	if (input.destinationId !== undefined) {
		and.push({
			lotItems: { some: { destinationId: input.destinationId } },
		});
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
				{ code: { contains: input.search } },
				{ operation: { code: { contains: input.search } } },
				{ supplier: { name: { contains: input.search } } },
				{ supplierOrder: { code: { contains: input.search } } },
			],
		});
	}

	return and.length > 0 ? { AND: and } : {};
}

export async function listLotCandidates(
	db: AdminDbClient,
	input: LotListInput,
) {
	return db.lot.findMany({
		where: buildLotWhere(input),
		select: lotDetailSelect,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
	});
}

export async function findLotById(db: AdminDbClient, id: number) {
	return db.lot.findUnique({
		where: { id },
		select: lotDetailSelect,
	});
}

export async function listLatestLotTrackingEvents(
	db: AdminDbClient,
	input: { lotId: number; lotItemIds: number[] },
) {
	const or: Prisma.CartItemTrackingEventWhereInput[] = [{ lotId: input.lotId }];
	if (input.lotItemIds.length > 0) {
		or.push({ lotItemId: { in: input.lotItemIds } });
	}

	const records = await db.cartItemTrackingEvent.findMany({
		where: {
			OR: or,
		},
		select: lotTrackingEventSelect,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: 5,
	});

	return records as LotTrackingEventRecord[];
}
