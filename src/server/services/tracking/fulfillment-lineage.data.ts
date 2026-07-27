import "server-only";

import type {
	CartItemStatus,
	LotItemStatus,
	LotStatus,
	PackageLeg,
	PackageLotItemStatus,
	PackageStatus,
	Prisma,
	RollOverStatus,
	ShipmentStatus,
	SupplierOrderStatus,
} from "~/prisma/client";

export type FulfillmentPackagedAllocationSnapshot = {
	quantity: Prisma.Decimal;
	packageLineStatus: PackageLotItemStatus;
	packageStatus: PackageStatus;
	/** The authoritative leg source since Phase 3; the shipment type never was one (ADR 0004). */
	leg: PackageLeg;
	shipmentStatus: ShipmentStatus | null;
};

export type FulfillmentAllocationSnapshot = {
	quantity: Prisma.Decimal;
	lotItemStatus: LotItemStatus;
	lotStatus: LotStatus;
	supplierOrderStatus: SupplierOrderStatus | null;
	packagedAllocations: FulfillmentPackagedAllocationSnapshot[];
};

export type FulfillmentLineageSnapshot = {
	cartItem: {
		id: number;
		deleted: boolean;
		status: CartItemStatus;
	};
	rollOvers: Array<{
		status: RollOverStatus;
		quantity: Prisma.Decimal;
	}>;
	allocations: FulfillmentAllocationSnapshot[];
};

const fulfillmentLineageSelect = {
	id: true,
	deleted: true,
	status: true,
	rollOvers: {
		select: { status: true, quantity: true },
	},
	cartItemLotItems: {
		select: {
			quantity: true,
			lotItem: {
				select: {
					status: true,
					lot: {
						select: {
							status: true,
							supplierOrder: { select: { status: true } },
						},
					},
				},
			},
			packageAllocations: {
				select: {
					quantity: true,
					packageLotItem: {
						select: {
							status: true,
							package: {
								select: {
									status: true,
									leg: true,
									shipment: { select: { status: true } },
								},
							},
						},
					},
				},
			},
		},
	},
} satisfies Prisma.CartItemSelect;

export async function loadFulfillmentLineageSnapshot(
	tx: Prisma.TransactionClient,
	cartItemId: number,
): Promise<FulfillmentLineageSnapshot | null> {
	const record = await tx.cartItem.findUnique({
		where: { id: cartItemId },
		select: fulfillmentLineageSelect,
	});

	if (!record) return null;

	return {
		cartItem: {
			id: record.id,
			deleted: record.deleted,
			status: record.status,
		},
		rollOvers: record.rollOvers.map((rollOver) => ({
			status: rollOver.status,
			quantity: rollOver.quantity,
		})),
		allocations: record.cartItemLotItems.map((allocation) => ({
			quantity: allocation.quantity,
			lotItemStatus: allocation.lotItem.status,
			lotStatus: allocation.lotItem.lot.status,
			supplierOrderStatus: allocation.lotItem.lot.supplierOrder?.status ?? null,
			packagedAllocations: allocation.packageAllocations.map((packaged) => ({
				quantity: packaged.quantity,
				packageLineStatus: packaged.packageLotItem.status,
				packageStatus: packaged.packageLotItem.package.status,
				leg: packaged.packageLotItem.package.leg,
				shipmentStatus:
					packaged.packageLotItem.package.shipment?.status ?? null,
			})),
		})),
	};
}
