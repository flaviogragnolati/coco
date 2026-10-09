import type { UserOrderStatus } from "~/prisma/client";
import {
	type DeliveryPreference,
	describeDeliveryChoice,
	readAddressSnapshot,
} from "~/shared/common/delivery-display";
import {
	buildPickupPointSnapshot,
	type PickupPointData,
} from "~/shared/common/pickup-point-snapshot";
import type { OperationalDiagnostic } from "./operational-diagnostics.types";

/** A cart's live order, reduced to what fulfillment needs about its delivery. */
export type OrderDelivery = {
	cartId: number;
	orderId: number;
	orderCode: string;
	status: UserOrderStatus;
	customerName: string;
	customerEmail: string;
	/** Null on orders paid before the customer could choose. */
	deliveryPreference: DeliveryPreference | null;
	pickupPointId: number | null;
	pickupPointName: string | null;
	pickupPointActive: boolean | null;
	shippingAddressSnapshot: unknown;
};

export type ShipmentDeliveryTarget = {
	deliveryMode: DeliveryPreference;
	pickupPointId: number | null;
};

type AllocationTree = {
	packageLotItems: Array<{
		status: string;
		packageAllocations: Array<{
			cartItemLotItem: { cartItem: { cartId: number } };
		}>;
	}>;
};

/** Carts a package's live lines serve: the customer is derived, never stored. */
export function packageCartIds(pkg: AllocationTree): number[] {
	return [
		...new Set(
			pkg.packageLotItems
				.filter((line) => line.status !== "cancelled")
				.flatMap((line) =>
					line.packageAllocations.map(
						(allocation) => allocation.cartItemLotItem.cartItem.cartId,
					),
				),
		),
	];
}

export function ordersOfCarts(
	cartIds: number[],
	ordersByCartId: Map<number, OrderDelivery>,
): OrderDelivery[] {
	return cartIds.flatMap((cartId) => {
		const order = ordersByCartId.get(cartId);
		return order ? [order] : [];
	});
}

function choiceOf(order: OrderDelivery) {
	return describeDeliveryChoice({
		mode: order.deliveryPreference,
		pickupPointName: order.pickupPointName ?? undefined,
	});
}

/**
 * The match rule (ADR 0011): an end-user shipment may only carry packages whose
 * order chose its mode and, for a pickup point, the same point. Orders without a
 * preference predate the choice and are exempt. Returns the first violation.
 */
export function findDeliveryMismatch(
	target: ShipmentDeliveryTarget,
	orders: OrderDelivery[],
): { order: OrderDelivery; message: string } | null {
	for (const order of orders) {
		if (order.deliveryPreference === null) continue;

		const matches =
			order.deliveryPreference === target.deliveryMode &&
			(target.deliveryMode === "homeDelivery" ||
				order.pickupPointId === target.pickupPointId);
		if (matches) continue;

		return {
			order,
			message: `El pedido ${order.orderCode} eligió ${choiceOf(order)}; cambiá su entrega primero.`,
		};
	}

	return null;
}

/** Two orders that both chose, and chose differently, cannot share a package. */
export function hasDeliveryConflict(orders: OrderDelivery[]) {
	const choices = new Set(
		orders
			.filter((order) => order.deliveryPreference !== null)
			.map((order) => `${order.deliveryPreference}:${order.pickupPointId}`),
	);
	return choices.size > 1;
}

export type ShipmentDestination = {
	destinationAddressSnapshot: Record<string, unknown> | null;
	destinationContactSnapshot: Record<string, unknown> | null;
};

/**
 * Where an end-user shipment goes, derived on the server: the point for a
 * pickup shipment, the single customer's order address for a home delivery.
 * Legacy data without an address leaves the destination empty, as before.
 */
export function deriveShipmentDestination(
	input:
		| { deliveryMode: "pickupPoint"; pickupPoint: PickupPointData }
		| { deliveryMode: "homeDelivery"; orders: OrderDelivery[] },
	capturedAt: Date = new Date(),
): ShipmentDestination {
	if (input.deliveryMode === "pickupPoint") {
		return {
			destinationAddressSnapshot: buildPickupPointSnapshot(
				input.pickupPoint,
				"shipment",
				capturedAt,
			),
			destinationContactSnapshot: null,
		};
	}

	const [order] = input.orders;
	if (!order) {
		return {
			destinationAddressSnapshot: null,
			destinationContactSnapshot: null,
		};
	}

	const address = readAddressSnapshot(order.shippingAddressSnapshot);
	return {
		destinationAddressSnapshot: address
			? {
					source: "order",
					capturedAt: capturedAt.toISOString(),
					orderId: order.orderId,
					orderCode: order.orderCode,
					address,
				}
			: null,
		destinationContactSnapshot: {
			name: order.customerName,
			email: order.customerEmail,
		},
	};
}

/** A paid order waiting on a point that checkout no longer offers. */
export function deliveryPreferenceDiagnostics(
	order: OrderDelivery,
): OperationalDiagnostic[] {
	if (
		order.status !== "processing" ||
		order.deliveryPreference !== "pickupPoint" ||
		order.pickupPointId === null ||
		order.pickupPointActive !== false
	) {
		return [];
	}

	return [
		{
			code: "order.deliveryPreference.pointInactive",
			severity: "warning",
			message: `El pedido ${order.orderCode} eligió el punto de retiro "${order.pickupPointName}", que ya no está activo; cambiá su entrega.`,
			refs: { orderId: order.orderId, pickupPointId: order.pickupPointId },
		},
	];
}
