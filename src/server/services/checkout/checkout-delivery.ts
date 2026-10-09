import type {
	CheckoutAddress,
	CheckoutDeliveryInput,
} from "~/shared/common/checkout.types";
import type { DeliveryPreference } from "~/shared/common/delivery-display";
import {
	buildPickupPointSnapshot,
	type PickupPointData,
	type PickupPointSnapshot,
} from "~/shared/common/pickup-point-snapshot";

export type CheckoutAddressSnapshot = {
	source: "checkout";
	capturedAt: string;
	address: CheckoutAddress;
};

/** The order columns a delivery choice writes, as one unit. */
export type OrderDeliveryColumns = {
	deliveryPreference: DeliveryPreference;
	pickupPointId: number | null;
	pickupPointSnapshot: PickupPointSnapshot | null;
	shippingAddressSnapshot: CheckoutAddressSnapshot | null;
};

export function buildAddressSnapshot(
	address: CheckoutAddress,
	capturedAt: Date = new Date(),
): CheckoutAddressSnapshot {
	return {
		source: "checkout",
		capturedAt: capturedAt.toISOString(),
		address,
	};
}

/**
 * Turns the customer's checkout choice into order columns. Used by both the
 * create and the reuse paths of `confirmAndPay`, so a live order always carries
 * the latest choice. A pickup order stores no address (the CHECK on
 * `user_order` enforces it).
 */
export function resolveCheckoutDelivery(
	input:
		| {
				delivery: Extract<CheckoutDeliveryInput, { mode: "homeDelivery" }>;
				address: CheckoutAddress;
		  }
		| {
				delivery: Extract<CheckoutDeliveryInput, { mode: "pickupPoint" }>;
				pickupPoint: PickupPointData;
		  },
	capturedAt: Date = new Date(),
): OrderDeliveryColumns {
	if ("pickupPoint" in input) {
		return {
			deliveryPreference: "pickupPoint",
			pickupPointId: input.pickupPoint.id,
			pickupPointSnapshot: buildPickupPointSnapshot(
				input.pickupPoint,
				"checkout",
				capturedAt,
			),
			shippingAddressSnapshot: null,
		};
	}

	return {
		deliveryPreference: "homeDelivery",
		pickupPointId: null,
		pickupPointSnapshot: null,
		shippingAddressSnapshot: buildAddressSnapshot(input.address, capturedAt),
	};
}
