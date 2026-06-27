import type { Prisma } from "~/prisma/client";

type AdminDbClient = Prisma.TransactionClient;

const userSummarySelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	deleted: true,
} satisfies Prisma.UserSelect;

const cartTraceabilitySelect = {
	id: true,
	code: true,
	status: true,
	deleted: true,
	createdAt: true,
	updatedAt: true,
	user: {
		select: userSummarySelect,
	},
	cartItems: {
		orderBy: [{ deleted: "asc" }, { createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			code: true,
			quantity: true,
			status: true,
			fulfillmentStatus: true,
			deleted: true,
			createdAt: true,
			updatedAt: true,
			productClientTerms: {
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
			cartItemLotItems: {
				orderBy: [{ createdAt: "asc" }, { id: "asc" }],
				select: {
					id: true,
					quantity: true,
					lotItem: {
						select: {
							id: true,
							code: true,
							status: true,
							quantity: true,
							productSupplierTerms: {
								select: {
									product: {
										select: {
											name: true,
										},
									},
								},
							},
							lot: {
								select: {
									id: true,
									code: true,
									status: true,
									supplier: {
										select: {
											name: true,
										},
									},
									operation: {
										select: {
											id: true,
											code: true,
											status: true,
											strategy: true,
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
							packageLotItem: {
								select: {
									id: true,
									quantity: true,
									status: true,
									package: {
										select: {
											id: true,
											name: true,
											status: true,
											trackingCode: true,
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
										},
									},
								},
							},
						},
					},
				},
			},
			rollOvers: {
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				select: {
					id: true,
					stage: true,
					status: true,
					quantity: true,
					reason: true,
					operation: {
						select: {
							id: true,
							code: true,
							status: true,
						},
					},
				},
			},
		},
	},
	userOrders: {
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			code: true,
			status: true,
			createdAt: true,
			updatedAt: true,
			transactions: {
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				select: {
					id: true,
					amount: true,
					currency: true,
					status: true,
					provider: true,
					createdAt: true,
					updatedAt: true,
					paymentMethod: {
						select: {
							type: true,
						},
					},
				},
			},
		},
	},
} satisfies Prisma.CartSelect;

export type CartTraceabilityRecord = Prisma.CartGetPayload<{
	select: typeof cartTraceabilitySelect;
}>;

export type CartTraceabilityItemRecord =
	CartTraceabilityRecord["cartItems"][number];

export async function getCartTraceabilityRecord(
	db: AdminDbClient,
	cartId: number,
) {
	return db.cart.findUnique({
		where: { id: cartId },
		select: cartTraceabilitySelect,
	});
}

/**
 * Walks the loaded cart graph and returns the distinct lot / package / shipment
 * ids touched by any of its items, so diagnostics can be loaded with a bounded
 * number of batched reads instead of an N+1 per allocation.
 */
export function collectLineageEntityIds(record: CartTraceabilityRecord) {
	const lotIds = new Set<number>();
	const packageIds = new Set<number>();
	const shipmentIds = new Set<number>();

	for (const item of record.cartItems) {
		for (const allocation of item.cartItemLotItems) {
			lotIds.add(allocation.lotItem.lot.id);

			for (const packaging of allocation.packageAllocations) {
				packageIds.add(packaging.packageLotItem.package.id);
				const shipment = packaging.packageLotItem.package.shipment;
				if (shipment) shipmentIds.add(shipment.id);
			}
		}
	}

	return {
		lotIds: Array.from(lotIds),
		packageIds: Array.from(packageIds),
		shipmentIds: Array.from(shipmentIds),
	};
}
