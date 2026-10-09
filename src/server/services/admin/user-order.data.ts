import { Prisma } from "~/prisma/client";
import type { DeliveryPreference } from "~/shared/common/delivery-display";
import { toPrismaInputJson } from "./_base/prisma-json";

type AdminDbClient = Prisma.TransactionClient;

const orderDeliveryChangeSelect = {
	id: true,
	code: true,
	status: true,
	userId: true,
	deliveryPreference: true,
	pickupPointId: true,
	pickupPointSnapshot: true,
	shippingAddressSnapshot: true,
	pickupPoint: { select: { name: true } },
	items: {
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			sourceCartItemId: true,
			sourceCartItem: { select: { status: true } },
		},
	},
} satisfies Prisma.UserOrderSelect;

export type OrderDeliveryChangeRecord = Prisma.UserOrderGetPayload<{
	select: typeof orderDeliveryChangeSelect;
}>;

export async function findOrderForDeliveryChange(
	db: AdminDbClient,
	id: number,
) {
	return db.userOrder.findUnique({
		where: { id },
		select: orderDeliveryChangeSelect,
	});
}

/**
 * Outbound packages carrying any of these items' demand that already sit on an
 * end-user shipment (any status) or were handed over. While one exists, the
 * shipment and the order would contradict each other after a change.
 */
export async function countPackagesBlockingDeliveryChange(
	db: AdminDbClient,
	cartItemIds: number[],
) {
	if (cartItemIds.length === 0) return 0;

	return db.package.count({
		where: {
			leg: "outbound",
			status: { not: "cancelled" },
			OR: [{ shipmentId: { not: null } }, { status: "received" }],
			packageLotItems: {
				some: {
					status: { not: "cancelled" },
					packageAllocations: {
						some: { cartItemLotItem: { cartItemId: { in: cartItemIds } } },
					},
				},
			},
		},
	});
}

export type OrderDeliveryUpdate = {
	deliveryPreference: DeliveryPreference;
	pickupPointId: number | null;
	pickupPointSnapshot: unknown;
	shippingAddressSnapshot: unknown;
};

/**
 * Serializes "Cambiar entrega" against shipment assembly, which share-locks the
 * same row before reading the preference (`lockLiveOrdersOfCarts`).
 */
export async function lockOrderForDeliveryChange(
	db: AdminDbClient,
	id: number,
) {
	await db.$queryRaw`SELECT "id" FROM "user_order" WHERE "id" = ${id} FOR UPDATE`;
}

function jsonOrDbNull(value: unknown) {
	return value == null ? Prisma.DbNull : toPrismaInputJson(value);
}

/**
 * Cleared JSON goes as `Prisma.DbNull`, which the `user_order` delivery CHECK
 * requires. Billing mirrors the shipping address, as checkout writes it.
 */
export function orderDeliveryUpdateData(update: OrderDeliveryUpdate) {
	return {
		deliveryPreference: update.deliveryPreference,
		pickupPointId: update.pickupPointId,
		pickupPointSnapshot: jsonOrDbNull(update.pickupPointSnapshot),
		shippingAddressSnapshot: jsonOrDbNull(update.shippingAddressSnapshot),
		billingAddressSnapshot: jsonOrDbNull(update.shippingAddressSnapshot),
	};
}

export async function updateOrderDeliveryPreference(
	db: AdminDbClient,
	id: number,
	update: OrderDeliveryUpdate,
) {
	return db.userOrder.update({
		where: { id },
		data: orderDeliveryUpdateData(update),
		select: orderDeliveryChangeSelect,
	});
}
