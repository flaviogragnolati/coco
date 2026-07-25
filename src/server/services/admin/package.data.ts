import type { Prisma } from "~/prisma/client";
import type { PackageListInput } from "~/shared/common/admin-crud/package.types";
import { fromDateTimeLocalValue } from "~/shared/common/date.helpers";

type AdminDbClient = Prisma.TransactionClient;

const userSummarySelect = {
	id: true,
	name: true,
	email: true,
	deleted: true,
} satisfies Prisma.UserSelect;

const packageTrackingEventSelect = {
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

const packageDetailSelect = {
	id: true,
	name: true,
	trackingCode: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	shipment: {
		select: {
			id: true,
			name: true,
			internalCode: true,
			status: true,
			type: true,
			trackingCode: true,
		},
	},
	packageLotItems: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			quantity: true,
			status: true,
			lotItem: {
				select: {
					id: true,
					code: true,
					status: true,
					quantity: true,
					lot: {
						select: {
							id: true,
							code: true,
							supplier: {
								select: {
									name: true,
								},
							},
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
							lotItemId: true,
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
		},
	},
} satisfies Prisma.PackageSelect;

export type PackageDetailRecord = Prisma.PackageGetPayload<{
	select: typeof packageDetailSelect;
}>;

const packageSummarySelect = {
	id: true,
	name: true,
	trackingCode: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	shipment: {
		select: {
			id: true,
			name: true,
			internalCode: true,
			status: true,
			type: true,
			trackingCode: true,
		},
	},
	packageLotItems: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			status: true,
			quantity: true,
			packageAllocations: {
				select: {
					id: true,
					quantity: true,
					cartItemLotItem: {
						select: {
							id: true,
							quantity: true,
						},
					},
				},
			},
		},
	},
} satisfies Prisma.PackageSelect;

export type PackageSummaryRecord = Prisma.PackageGetPayload<{
	select: typeof packageSummarySelect;
}>;

export type PackageTrackingEventRecord =
	Prisma.CartItemTrackingEventGetPayload<{
		select: typeof packageTrackingEventSelect;
	}>;

function buildPackageWhere(input: PackageListInput): Prisma.PackageWhereInput {
	const and: Prisma.PackageWhereInput[] = [];

	if (input.packageId !== undefined) and.push({ id: input.packageId });
	if (input.status !== undefined) and.push({ status: input.status });
	if (input.shipmentId !== undefined)
		and.push({ shipmentId: input.shipmentId });
	if (input.lotId !== undefined) {
		and.push({
			packageLotItems: { some: { lotItem: { lotId: input.lotId } } },
		});
	}
	if (input.lotItemId !== undefined) {
		and.push({ packageLotItems: { some: { lotItemId: input.lotItemId } } });
	}
	if (input.productId !== undefined) {
		and.push({
			packageLotItems: {
				some: {
					lotItem: {
						productSupplierTerms: { productId: input.productId },
					},
				},
			},
		});
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
				{ name: { contains: input.search } },
				{ trackingCode: { contains: input.search } },
				{ shipment: { internalCode: { contains: input.search } } },
				{ shipment: { name: { contains: input.search } } },
			],
		});
	}

	return and.length > 0 ? { AND: and } : {};
}

export async function listPackageCandidates(
	db: AdminDbClient,
	input: PackageListInput,
	options?: { skip?: number; take?: number },
) {
	const direction = input.sortDirection;

	return db.package.findMany({
		where: buildPackageWhere(input),
		select: packageSummarySelect,
		orderBy: [{ createdAt: direction }, { id: direction }],
		skip: options?.skip,
		take: options?.take,
	});
}

export async function countPackageCandidates(
	db: AdminDbClient,
	input: PackageListInput,
) {
	return db.package.count({ where: buildPackageWhere(input) });
}

export async function getPackageStats(db: AdminDbClient) {
	const [total, byStatus, packageLineQuantity, packagedAllocationQuantity] =
		await Promise.all([
			db.package.count(),
			db.package.groupBy({ by: ["status"], _count: { _all: true } }),
			db.packageLotItem.aggregate({ _sum: { quantity: true } }),
			db.packageAllocation.aggregate({ _sum: { quantity: true } }),
		]);

	return {
		total,
		byStatus,
		packageLineQuantity: packageLineQuantity._sum.quantity,
		packagedAllocationQuantity: packagedAllocationQuantity._sum.quantity,
	};
}

export async function findPackageById(db: AdminDbClient, id: number) {
	return db.package.findUnique({
		where: { id },
		select: packageDetailSelect,
	});
}

export async function listPackagesByIds(
	db: AdminDbClient,
	ids: number[],
): Promise<PackageDetailRecord[]> {
	if (ids.length === 0) return [];

	return db.package.findMany({
		where: { id: { in: ids } },
		select: packageDetailSelect,
	});
}

export async function listLatestPackageTrackingEvents(
	db: AdminDbClient,
	packageId: number,
) {
	const records = await db.cartItemTrackingEvent.findMany({
		where: { packageId },
		select: packageTrackingEventSelect,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: 5,
	});

	return records as PackageTrackingEventRecord[];
}
