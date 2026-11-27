/**
 * Pure model of the "Finalizar" panel on the order page (ADR 0015): which
 * delivery and payment method are in effect, what is still missing, and the
 * confirmation that follows from them. No React, no I/O — unit-tested in
 * `finish-order.test.ts`. Replaces the step model of the checkout screen.
 */

import type {
	CheckoutAddress,
	CheckoutConfirmInput,
	CheckoutPaymentMethod,
	CheckoutState,
} from "~/shared/common/checkout.types";
import type { DeliveryPreference } from "~/shared/common/delivery-display";
import type { PickupPointData } from "~/shared/common/pickup-point-snapshot";

/**
 * What the customer picked in this session. Every field is a wish: an id that
 * is no longer offered falls back instead of failing. The payment is kept by
 * provider because that is what the customer chooses between.
 */
export type FinishDraft = {
	deliveryMode: DeliveryPreference | null;
	addressId: number | null;
	pickupPointId: number | null;
	provider: string | null;
};

export const EMPTY_FINISH_DRAFT: FinishDraft = {
	deliveryMode: null,
	addressId: null,
	pickupPointId: null,
	provider: null,
};

export type FinishSelection = {
	deliveryMode: DeliveryPreference;
	/** The address in effect for home delivery; null when there is none. */
	address: CheckoutAddress | null;
	/** The point in effect for pickup; null when none is offered. */
	pickupPoint: PickupPointData | null;
	paymentMethod: CheckoutPaymentMethod | null;
};

export type FinishOptions = Pick<
	CheckoutState,
	"addresses" | "pickupPoints" | "paymentMethods" | "liveOrder"
>;

function pickById<T extends { id: number }>(
	options: readonly T[],
	...ids: Array<number | null | undefined>
) {
	for (const id of ids) {
		const found = options.find((option) => option.id === id);
		if (found) return found;
	}
	return options[0] ?? null;
}

/**
 * The choices in effect. Each one comes from the draft first, then from the
 * order the cart is waiting on, then from the first option offered. The draft
 * wins over the live order so that confirming again can change the payment
 * method or the delivery.
 */
export function resolveFinishSelection(
	options: FinishOptions,
	draft: FinishDraft,
): FinishSelection {
	const confirmed = options.liveOrder?.delivery ?? null;
	const wantedMode = draft.deliveryMode ?? confirmed?.mode ?? "homeDelivery";
	// Without an active point, pickup is not offered at all.
	const deliveryMode =
		wantedMode === "pickupPoint" && options.pickupPoints.length === 0
			? "homeDelivery"
			: wantedMode;

	const address = pickById(
		options.addresses,
		draft.addressId,
		confirmed?.mode === "homeDelivery" ? confirmed.shippingAddressId : null,
	);
	const pickupPoint = pickById(
		options.pickupPoints,
		draft.pickupPointId,
		confirmed?.mode === "pickupPoint" ? confirmed.pickupPointId : null,
	);

	const byDraft = options.paymentMethods.find(
		(method) => method.provider === draft.provider,
	);
	const paymentMethod =
		byDraft ??
		pickById(options.paymentMethods, options.liveOrder?.paymentMethodId);

	return { deliveryMode, address, pickupPoint, paymentMethod };
}

export type FinishBlocker = "address" | "pickupPoint" | "payment" | "terms";

/** What still stops the customer from confirming, in the order the panel reads. */
export function finishBlockers(
	selection: FinishSelection,
	input: { acceptedTerms: boolean },
): FinishBlocker[] {
	const blockers: FinishBlocker[] = [];
	if (selection.deliveryMode === "homeDelivery" && !selection.address) {
		blockers.push("address");
	}
	if (selection.deliveryMode === "pickupPoint" && !selection.pickupPoint) {
		blockers.push("pickupPoint");
	}
	if (!selection.paymentMethod) blockers.push("payment");
	if (!input.acceptedTerms) blockers.push("terms");
	return blockers;
}

/** The sentence next to a disabled confirm button. */
export const finishBlockerMessages: Record<FinishBlocker, string> = {
	address: "Agregá la dirección donde lo recibís.",
	pickupPoint: "Elegí un punto de retiro.",
	payment: "Elegí cómo pagás.",
	terms: "Aceptá los términos del pedido para confirmar.",
};

/**
 * The confirmation the panel sends, or null while something is missing.
 * `expectedAmount` is the figure the screen shows for the chosen method.
 */
export function toConfirmInput(
	selection: FinishSelection,
	input: {
		acceptedTerms: boolean;
		expectedAmount: string;
		idempotencyKey: string;
	},
): CheckoutConfirmInput | null {
	if (finishBlockers(selection, input).length > 0) return null;
	const { paymentMethod, address, pickupPoint } = selection;
	if (!paymentMethod) return null;

	const delivery: CheckoutConfirmInput["delivery"] | null =
		selection.deliveryMode === "pickupPoint"
			? pickupPoint && { mode: "pickupPoint", pickupPointId: pickupPoint.id }
			: address && { mode: "homeDelivery", shippingAddressId: address.id };
	if (!delivery) return null;

	return {
		delivery,
		paymentMethodId: paymentMethod.id,
		acceptedTerms: true,
		idempotencyKey: input.idempotencyKey,
		expectedAmount: input.expectedAmount,
	};
}
