import { Prisma } from "~/prisma/client";
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

/**
 * Every live packaged allocation of one demand allocation, with enough of the
 * package to tell the two legs apart. Selected wherever a caller needs the
 * derived quantities below, so the filter and the query never drift apart.
 */
const packagedAllocationSelect = {
	quantity: true,
	packageLotItem: {
		select: {
			status: true,
			package: { select: { status: true, leg: true } },
		},
	},
} satisfies Prisma.PackageAllocationSelect;

export type PackagedAllocationRecord = Prisma.PackageAllocationGetPayload<{
	select: typeof packagedAllocationSelect;
}>;

type DemandAllocationPackaging = {
	packageAllocations: PackagedAllocationRecord[];
};

function isLivePackaging(packaged: PackagedAllocationRecord) {
	return (
		packaged.packageLotItem.status !== "cancelled" &&
		packaged.packageLotItem.package.status !== "cancelled"
	);
}

function sumPackaged(
	allocation: DemandAllocationPackaging,
	predicate: (packaged: PackagedAllocationRecord) => boolean,
): Prisma.Decimal {
	return allocation.packageAllocations
		.filter((packaged) => isLivePackaging(packaged) && predicate(packaged))
		.reduce<Prisma.Decimal>(
			(total, packaged) => total.plus(packaged.quantity),
			new Prisma.Decimal(0),
		);
}

/**
 * How much of a demand allocation already left on the **outbound** leg — what
 * fractionation and promotion produced. The mirror of `packagedQuantity` in
 * `supplier-order.data.ts`, which counts the inbound leg for the same reason:
 * per-leg conservation (ADR 0004) means the two sums answer different questions
 * and must never be merged.
 */
export function outboundPackagedQuantity(
	allocation: DemandAllocationPackaging,
): Prisma.Decimal {
	return sumPackaged(
		allocation,
		(packaged) => packaged.packageLotItem.package.leg === "outbound",
	);
}

/**
 * How much of a demand allocation physically arrived. `received` is required,
 * not merely inbound-and-live: without it an operator could fractionate goods
 * that are still on the truck.
 */
export function receivedInboundQuantity(
	allocation: DemandAllocationPackaging,
): Prisma.Decimal {
	return sumPackaged(
		allocation,
		(packaged) =>
			packaged.packageLotItem.package.leg === "inbound" &&
			packaged.packageLotItem.package.status === "received",
	);
}

/** What has arrived and has not been packaged out yet, floored at 0. */
export function fractionableQuantity(
	allocation: DemandAllocationPackaging,
): Prisma.Decimal {
	const remaining = receivedInboundQuantity(allocation).minus(
		outboundPackagedQuantity(allocation),
	);
	return remaining.lessThan(0) ? new Prisma.Decimal(0) : remaining;
}

type FractionablePackagedAllocation = {
	quantity: Prisma.Decimal;
	cartItemLotItem: DemandAllocationPackaging;
};

type FractionableLine = {
	status: string;
	packageAllocations: FractionablePackagedAllocation[];
};

/**
 * What one packaged allocation can still contribute. The min() is load-bearing: a
 * demand allocation can be covered by two received packages, and without it both
 * would offer the same quantity and together package it twice.
 */
export function packagedAllocationFractionableQuantity(
	packaged: FractionablePackagedAllocation,
): Prisma.Decimal {
	const available = fractionableQuantity(packaged.cartItemLotItem);
	return available.lessThan(packaged.quantity) ? available : packaged.quantity;
}

/** How much of *this* package is still available to fractionate. */
export function packageFractionableQuantity(
	lines: FractionableLine[],
): Prisma.Decimal {
	return lines
		.filter((line) => line.status !== "cancelled")
		.flatMap((line) => line.packageAllocations)
		.reduce<Prisma.Decimal>(
			(total, packaged) =>
				total.plus(packagedAllocationFractionableQuantity(packaged)),
			new Prisma.Decimal(0),
		);
}

const packageDetailSelect = {
	id: true,
	name: true,
	trackingCode: true,
	status: true,
	leg: true,
	createdAt: true,
	updatedAt: true,
	shipment: {
		select: {
			id: true,
			name: true,
			internalCode: true,
			status: true,
			type: true,
			deliveryMode: true,
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
							// What the detail's `fractionableQuantity` reads: the same demand
							// can sit in another package on either leg.
							packageAllocations: { select: packagedAllocationSelect },
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
	leg: true,
	createdAt: true,
	updatedAt: true,
	shipment: {
		select: {
			id: true,
			name: true,
			internalCode: true,
			status: true,
			type: true,
			deliveryMode: true,
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
							// The customer of an outbound package is derived from here; there
							// is no `Package.cartId` column.
							cartItem: { select: { cartId: true } },
							// Per-leg conservation (ADR 0004): the same demand allocation can
							// be covered by several packages, so the rule has to see all of
							// them, not just the ones inside the package being scanned.
							packageAllocations: { select: packagedAllocationSelect },
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
	if (input.leg !== undefined) and.push({ leg: input.leg });
	if (input.shipmentId !== undefined)
		and.push({ shipmentId: input.shipmentId });
	if (input.unassigned === true) and.push({ shipmentId: null });
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
	const [
		total,
		byStatus,
		byLeg,
		packageLineQuantity,
		packagedAllocationQuantity,
	] = await Promise.all([
		db.package.count(),
		db.package.groupBy({ by: ["status"], _count: { _all: true } }),
		db.package.groupBy({ by: ["leg"], _count: { _all: true } }),
		db.packageLotItem.aggregate({ _sum: { quantity: true } }),
		db.packageAllocation.aggregate({ _sum: { quantity: true } }),
	]);

	return {
		total,
		byStatus,
		byLeg,
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

/**
 * The command shape: everything a write-off needs to plan a shortfall — the
 * demand behind each line with its payment dates, and the lot the line belongs
 * to so the roll over attaches to that lot's own operation.
 */
const packageCommandSelect = {
	id: true,
	name: true,
	status: true,
	leg: true,
	shipment: { select: { id: true, internalCode: true, status: true } },
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
} satisfies Prisma.PackageSelect;

export type PackageCommandRecord = Prisma.PackageGetPayload<{
	select: typeof packageCommandSelect;
}>;

export async function findPackageForCommand(db: AdminDbClient, id: number) {
	return db.package.findUnique({ where: { id }, select: packageCommandSelect });
}

/**
 * The eligibility shape for putting packages on an end-user shipment: the leg,
 * the status, whether one is already assigned, and the customer behind each
 * allocation — the home-delivery one-cart rule needs the cart ids, and there is
 * no `Package.cartId` column to read them from.
 */
const shipmentAssignmentSelect = {
	id: true,
	name: true,
	status: true,
	leg: true,
	shipmentId: true,
	packageLotItems: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			status: true,
			packageAllocations: {
				select: {
					cartItemLotItem: {
						select: { cartItem: { select: { cartId: true } } },
					},
				},
			},
		},
	},
} satisfies Prisma.PackageSelect;

export type PackageAssignmentRecord = Prisma.PackageGetPayload<{
	select: typeof shipmentAssignmentSelect;
}>;

export async function findPackagesForShipmentAssignment(
	db: AdminDbClient,
	ids: number[],
): Promise<PackageAssignmentRecord[]> {
	if (ids.length === 0) return [];

	return db.package.findMany({
		where: { id: { in: ids } },
		select: shipmentAssignmentSelect,
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
	});
}

/**
 * The fractionation shape: every live line of a received inbound package, the
 * customer behind each packaged allocation, and — one level deeper — that demand
 * allocation's *own* packaged allocations, which is what makes
 * `fractionableQuantity` computable without an N+1 inside the transaction.
 */
const fractionationSourceSelect = {
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
									cart: { select: { user: { select: { name: true } } } },
								},
							},
							packageAllocations: { select: packagedAllocationSelect },
						},
					},
				},
			},
		},
	},
} satisfies Prisma.PackageSelect;

export type FractionationSourceRecord = Prisma.PackageGetPayload<{
	select: typeof fractionationSourceSelect;
}>;

export async function findPackagesForFractionation(
	db: AdminDbClient,
	ids: number[],
): Promise<FractionationSourceRecord[]> {
	if (ids.length === 0) return [];

	return db.package.findMany({
		where: { id: { in: ids } },
		select: fractionationSourceSelect,
		orderBy: { id: "asc" },
	});
}

/**
 * Lot lines and the demand behind them, re-read after fractionation wrote its
 * outbound rows so the closing predicate sees them (`closeReachableSupplierOrders`
 * re-reads its orders for the same reason).
 */
const packagingRollUpSelect = {
	id: true,
	status: true,
	lotId: true,
	cartItemLotItems: {
		select: {
			id: true,
			packageAllocations: { select: packagedAllocationSelect },
		},
	},
} satisfies Prisma.LotItemSelect;

export type PackagingRollUpRecord = Prisma.LotItemGetPayload<{
	select: typeof packagingRollUpSelect;
}>;

export async function findLotItemsForPackagingRollUp(
	db: AdminDbClient,
	lotItemIds: number[],
): Promise<PackagingRollUpRecord[]> {
	if (lotItemIds.length === 0) return [];

	return db.lotItem.findMany({
		where: { id: { in: lotItemIds } },
		select: packagingRollUpSelect,
	});
}

const lotRollUpSelect = {
	id: true,
	status: true,
	lotItems: { select: { id: true, status: true } },
} satisfies Prisma.LotSelect;

export type LotRollUpRecord = Prisma.LotGetPayload<{
	select: typeof lotRollUpSelect;
}>;

export async function findLotsForPackagingRollUp(
	db: AdminDbClient,
	lotIds: number[],
): Promise<LotRollUpRecord[]> {
	if (lotIds.length === 0) return [];

	return db.lot.findMany({
		where: { id: { in: lotIds } },
		select: lotRollUpSelect,
	});
}

export async function createInboundPackage(
	db: AdminDbClient,
	data: { name: string; shipmentId: number },
) {
	return db.package.create({
		data: {
			name: data.name,
			shipmentId: data.shipmentId,
			leg: "inbound",
			status: "readyForShipment",
		},
		select: { id: true },
	});
}

/**
 * A fractionation output: it exists at the destination and has not been handed to
 * anybody, so it starts on the outbound leg at `readyForShipment` with no
 * shipment. 4b is what gives it one.
 */
export async function createOutboundPackage(
	db: AdminDbClient,
	data: { name: string },
) {
	return db.package.create({
		data: { name: data.name, leg: "outbound", status: "readyForShipment" },
		select: { id: true },
	});
}

/**
 * A split output: it inherits the source's leg, status and shipment, because it
 * is the same goods in a different box. Keeping the siblings on the same shipment
 * is load-bearing — otherwise `shipment.package.missing` and the receipt's line
 * coverage break.
 */
export async function createSiblingPackage(
	db: AdminDbClient,
	data: {
		name: string;
		leg: Prisma.PackageCreateInput["leg"];
		status: Prisma.PackageCreateInput["status"];
		shipmentId: number | null;
	},
) {
	return db.package.create({
		data: {
			name: data.name,
			leg: data.leg,
			status: data.status,
			shipmentId: data.shipmentId,
		},
		select: { id: true },
	});
}

export async function updatePackageLeg(
	db: AdminDbClient,
	id: number,
	leg: Prisma.PackageUpdateInput["leg"],
) {
	await db.package.update({ where: { id }, data: { leg } });
}

export async function updatePackageName(
	db: AdminDbClient,
	id: number,
	name: string,
) {
	await db.package.update({ where: { id }, data: { name } });
}

export async function createPackageLines(
	db: AdminDbClient,
	rows: Array<{
		packageId: number;
		lotItemId: number;
		quantity: Prisma.Decimal;
	}>,
) {
	if (rows.length === 0) return [];

	return db.packageLotItem.createManyAndReturn({
		data: rows.map((row) => ({
			packageId: row.packageId,
			lotItemId: row.lotItemId,
			quantity: row.quantity.toString(),
			status: "packed" as const,
		})),
		select: { id: true, lotItemId: true },
	});
}

export async function createPackageAllocations(
	db: AdminDbClient,
	rows: Array<{
		packageLotItemId: number;
		cartItemLotItemId: number;
		quantity: Prisma.Decimal;
	}>,
) {
	if (rows.length === 0) return [];

	return db.packageAllocation.createManyAndReturn({
		data: rows.map((row) => ({
			packageLotItemId: row.packageLotItemId,
			cartItemLotItemId: row.cartItemLotItemId,
			quantity: row.quantity.toString(),
		})),
		select: { id: true },
	});
}

export async function updatePackageStatuses(
	db: AdminDbClient,
	ids: number[],
	status: Prisma.PackageUpdateManyMutationInput["status"],
) {
	if (ids.length === 0) return;

	await db.package.updateMany({ where: { id: { in: ids } }, data: { status } });
}

export async function updatePackageLineStatuses(
	db: AdminDbClient,
	ids: number[],
	status: Prisma.PackageLotItemUpdateManyMutationInput["status"],
) {
	if (ids.length === 0) return;

	await db.packageLotItem.updateMany({
		where: { id: { in: ids } },
		data: { status },
	});
}

export async function updatePackageLineState(
	db: AdminDbClient,
	id: number,
	data: {
		status?: Prisma.PackageLotItemUpdateInput["status"];
		quantity?: Prisma.Decimal;
	},
) {
	await db.packageLotItem.update({
		where: { id },
		data: { status: data.status, quantity: data.quantity?.toString() },
	});
}

export async function updatePackagedAllocationQuantity(
	db: AdminDbClient,
	id: number,
	quantity: Prisma.Decimal,
) {
	await db.packageAllocation.update({
		where: { id },
		data: { quantity: quantity.toString() },
	});
}

/**
 * Move packages to another shipment, preserving their identity: a retry keeps the
 * same package rows and only re-points them (architecture §8).
 */
export async function reassignPackagesToShipment(
	db: AdminDbClient,
	packageIds: number[],
	shipmentId: number,
) {
	if (packageIds.length === 0) return;

	await db.package.updateMany({
		where: { id: { in: packageIds } },
		data: { shipmentId },
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
