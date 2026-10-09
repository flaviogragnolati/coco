import type { Prisma } from "~/prisma/client";
import {
	userOrderDeliveryOptionsSchema,
	userOrderDeliverySchema,
} from "~/schemas/admin/user-order.schemas";
import { checkoutAddressSchema } from "~/schemas/checkout.schemas";
import type { db } from "~/server/db";
import { DomainEventDispatcher } from "~/server/events/domain-event-dispatcher";
import { DomainEventPublisher } from "~/server/events/domain-event-publisher";
import type {
	UserOrderDelivery,
	UserOrderDeliveryChangeInput,
	UserOrderDeliveryOptions,
} from "~/shared/common/admin-crud/user-order.types";
import {
	type DeliveryChoice,
	formatAddressLine,
	readAddressSnapshot,
	readPickupPointSnapshot,
} from "~/shared/common/delivery-display";
import { buildPickupPointSnapshot } from "~/shared/common/pickup-point-snapshot";
import {
	findCheckoutAddressById,
	listCheckoutAddresses,
} from "../checkout/checkout.data";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import { throwConflict, throwNotFound } from "./_base/admin-crud.errors";
import {
	findPickupPointById,
	listActivePickupPoints,
} from "./pickup-point.data";
import {
	countPackagesBlockingDeliveryChange,
	findOrderForDeliveryChange,
	lockOrderForDeliveryChange,
	type OrderDeliveryChangeRecord,
	type OrderDeliveryUpdate,
	updateOrderDeliveryPreference,
} from "./user-order.data";

type AdminDb = typeof db;
type AdminTx = Prisma.TransactionClient;

const USER_ORDER_ENTITY = "userOrder";

/** Items whose journey shows the change: the ones still requested. */
function liveCartItemIds(order: OrderDeliveryChangeRecord) {
	return order.items
		.filter((item) => item.sourceCartItem.status === "submitted")
		.map((item) => item.sourceCartItemId);
}

/**
 * Why "Cambiar entrega" is refused, or null. A change before payment belongs to
 * the customer in checkout; once a package is on an end-user shipment or handed
 * over, the shipment would contradict the order (ADR 0011).
 */
export function deliveryChangeBlockedReason(
	order: Pick<OrderDeliveryChangeRecord, "status">,
	blockingPackageCount: number,
): string | null {
	if (order.status !== "processing") {
		return "Solo se puede cambiar la entrega de un pedido pago que sigue en curso.";
	}
	if (blockingPackageCount > 0) {
		return "Un paquete del pedido ya está en un envío al cliente o fue entregado. Quitalo del envío antes de cambiar la entrega.";
	}
	return null;
}

function currentChoice(order: OrderDeliveryChangeRecord): DeliveryChoice {
	return {
		mode: order.deliveryPreference,
		pickupPointName:
			order.pickupPoint?.name ??
			readPickupPointSnapshot(order.pickupPointSnapshot)?.name,
	};
}

function deliveryOf(order: OrderDeliveryChangeRecord): UserOrderDelivery {
	return userOrderDeliverySchema.parse({
		orderId: order.id,
		deliveryPreference: order.deliveryPreference,
		pickupPointId: order.pickupPointId,
		pickupPointSnapshot: order.pickupPointSnapshot,
		shippingAddressSnapshot: order.shippingAddressSnapshot,
	});
}

async function loadOrder(tx: AdminTx, id: number) {
	const order = await findOrderForDeliveryChange(tx, id);
	if (!order) throwNotFound("Pedido");
	return order;
}

export async function deliveryOptions(
	orderId: number,
	database: AdminDb,
): Promise<UserOrderDeliveryOptions> {
	return database.$transaction(async (tx) => {
		const order = await loadOrder(tx, orderId);
		const blocking = await countPackagesBlockingDeliveryChange(
			tx,
			liveCartItemIds(order),
		);
		const addresses = await listCheckoutAddresses(tx, order.userId);
		const pickupPoints = await listActivePickupPoints(tx);

		return userOrderDeliveryOptionsSchema.parse({
			...deliveryOf(order),
			orderCode: order.code,
			addresses: addresses.map((address) =>
				checkoutAddressSchema.parse(address),
			),
			pickupPoints,
			blockedReason: deliveryChangeBlockedReason(order, blocking),
		});
	});
}

type ResolvedTarget = {
	update: OrderDeliveryUpdate;
	choice: DeliveryChoice & { mode: NonNullable<DeliveryChoice["mode"]> };
};

/** A saved address of the order's customer, or one typed for this order only. */
async function resolveHomeAddress(
	tx: AdminTx,
	userId: string,
	address: Extract<
		UserOrderDeliveryChangeInput["delivery"],
		{ mode: "homeDelivery" }
	>["address"],
) {
	if (!("addressId" in address)) return address.snapshot;

	const saved = await findCheckoutAddressById(tx, userId, address.addressId);
	if (!saved) {
		throwConflict("La dirección no es del cliente o ya no está disponible");
	}
	return checkoutAddressSchema.parse(saved);
}

async function resolveTarget(
	tx: AdminTx,
	order: OrderDeliveryChangeRecord,
	delivery: UserOrderDeliveryChangeInput["delivery"],
	capturedAt: Date,
): Promise<ResolvedTarget> {
	if (delivery.mode === "pickupPoint") {
		const point = await findPickupPointById(tx, delivery.pickupPointId);
		if (!point?.active || point.deleted) {
			throwConflict("El punto de retiro ya no está disponible");
		}
		if (
			order.deliveryPreference === "pickupPoint" &&
			order.pickupPointId === point.id
		) {
			throwConflict("El pedido ya tiene esa entrega");
		}

		return {
			update: {
				deliveryPreference: "pickupPoint",
				pickupPointId: point.id,
				pickupPointSnapshot: buildPickupPointSnapshot(
					point,
					"admin",
					capturedAt,
				),
				shippingAddressSnapshot: null,
			},
			choice: { mode: "pickupPoint", pickupPointName: point.name },
		};
	}

	const address = await resolveHomeAddress(tx, order.userId, delivery.address);
	const current = readAddressSnapshot(order.shippingAddressSnapshot);
	if (
		order.deliveryPreference === "homeDelivery" &&
		current &&
		formatAddressLine(current) === formatAddressLine(address)
	) {
		throwConflict("El pedido ya tiene esa entrega");
	}

	return {
		update: {
			deliveryPreference: "homeDelivery",
			pickupPointId: null,
			pickupPointSnapshot: null,
			shippingAddressSnapshot: {
				source: "admin",
				capturedAt: capturedAt.toISOString(),
				address,
			},
		},
		choice: { mode: "homeDelivery" },
	};
}

/**
 * "Cambiar entrega": the only writer of an order's delivery preference after
 * checkout. The reason is admin text the customer reads verbatim, so the
 * journey of every live item gets a notice through the tracking pipeline.
 */
export async function changeDeliveryPreference(
	input: UserOrderDeliveryChangeInput,
	actor: AdminMutationActor,
	database: AdminDb,
): Promise<UserOrderDelivery> {
	const result = await database.$transaction(async (tx) => {
		await lockOrderForDeliveryChange(tx, input.orderId);
		const order = await loadOrder(tx, input.orderId);
		const cartItemIds = liveCartItemIds(order);
		const blockedReason = deliveryChangeBlockedReason(
			order,
			await countPackagesBlockingDeliveryChange(tx, cartItemIds),
		);
		if (blockedReason) throwConflict(blockedReason);

		const changedAt = new Date();
		const target = await resolveTarget(tx, order, input.delivery, changedAt);
		const before = deliveryOf(order);
		const after = deliveryOf(
			await updateOrderDeliveryPreference(tx, order.id, target.update),
		);

		if (cartItemIds.length > 0) {
			await DomainEventPublisher.publish(tx, {
				type: "userOrder.deliveryPreferenceChanged",
				eventKey: `admin:userOrder:${order.id}:deliveryPreferenceChanged:${changedAt.toISOString()}`,
				aggregateType: "UserOrder",
				aggregateId: String(order.id),
				actor: {
					source: "admin",
					actorId: actor.id,
					actorReference: actor.name,
				},
				payload: {
					orderId: String(order.id),
					cartItemIds: cartItemIds.map(String),
					before: currentChoice(order),
					after: target.choice,
					reason: input.reason,
				},
			});
		}

		await writeAdminAuditLog(tx, {
			action: "userOrder.changeDeliveryPreference",
			actor,
			entityType: USER_ORDER_ENTITY,
			entityId: String(order.id),
			before,
			after,
			metadata: { reason: input.reason, cartItemIds },
		});

		return after;
	});

	await DomainEventDispatcher.wake();
	return result;
}
