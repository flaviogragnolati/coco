import { Prisma } from "~/prisma/client";
import type { db as prismaDb } from "~/server/db";
import type { OrderDelivery } from "./order-delivery";

type OrderDeliveryDbClient = typeof prismaDb | Prisma.TransactionClient;

const orderDeliverySelect = {
	id: true,
	code: true,
	status: true,
	cartId: true,
	deliveryPreference: true,
	pickupPointId: true,
	shippingAddressSnapshot: true,
	user: { select: { name: true, email: true } },
	pickupPoint: { select: { name: true, active: true, deleted: true } },
} satisfies Prisma.UserOrderSelect;

type OrderDeliveryRecord = Prisma.UserOrderGetPayload<{
	select: typeof orderDeliverySelect;
}>;

export function toOrderDelivery(record: OrderDeliveryRecord): OrderDelivery {
	return {
		cartId: record.cartId,
		orderId: record.id,
		orderCode: record.code,
		status: record.status,
		customerName: record.user.name,
		customerEmail: record.user.email,
		deliveryPreference: record.deliveryPreference,
		pickupPointId: record.pickupPointId,
		pickupPointName: record.pickupPoint?.name ?? null,
		pickupPointActive: record.pickupPoint
			? record.pickupPoint.active && !record.pickupPoint.deleted
			: null,
		shippingAddressSnapshot: record.shippingAddressSnapshot,
	};
}

/**
 * Share-locks the carts' live orders so "Cambiar entrega", which takes the row
 * lock, cannot change a preference between this read and the assignment.
 */
export async function lockLiveOrdersOfCarts(
	db: Prisma.TransactionClient,
	cartIds: number[],
) {
	if (cartIds.length === 0) return;
	await db.$queryRaw`SELECT "id" FROM "user_order" WHERE "cartId" IN (${Prisma.join([...new Set(cartIds)])}) AND "status" NOT IN ('cancelled', 'failed') FOR SHARE`;
}

/**
 * The live order (not cancelled, not failed) of each cart, in one query. A cart
 * has at most one: the same predicate backs `user_order_cart_live_unique`.
 */
export async function findLiveOrderDeliveriesByCartIds(
	db: OrderDeliveryDbClient,
	cartIds: number[],
): Promise<Map<number, OrderDelivery>> {
	if (cartIds.length === 0) return new Map();

	const records = await db.userOrder.findMany({
		where: {
			cartId: { in: [...new Set(cartIds)] },
			status: { notIn: ["cancelled", "failed"] },
		},
		select: orderDeliverySelect,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
	});

	const byCartId = new Map<number, OrderDelivery>();
	for (const record of records) {
		if (!byCartId.has(record.cartId)) {
			byCartId.set(record.cartId, toOrderDelivery(record));
		}
	}
	return byCartId;
}
