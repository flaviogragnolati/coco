import "server-only";

import type { CartStatus } from "~/shared/common/cart.types";
import {
	type CheckoutCartRecord,
	type CheckoutDbClient,
	cancelTransaction,
	findLiveOrderByCartId,
	updateCartStatus,
	updateOrderStatus,
} from "./checkout.data";
import {
	type CheckoutReleaseDecision,
	decideCheckoutRelease,
} from "./checkout-release.decision";

/**
 * Discriminated so a caller cannot read `cart` without having checked the
 * decision: only a release produces one.
 */
export type CheckoutReleaseOutcome =
	| { decision: "release"; cart: CheckoutCartRecord }
	| {
			decision: Exclude<CheckoutReleaseDecision, "release">;
			cart: null;
	  };

/**
 * The single implementation of handing a cart back to the customer: cancel the
 * live order and its pending attempt, then return the cart to `pending`. Both
 * `checkout.leave` and the automatic release a cart mutation performs go
 * through here, so the two can never drift apart.
 *
 * The attempt is cancelled, not erased, because the provider window may still
 * be open: if the user pays the old Mercado Pago preference afterwards,
 * reconciliation recovers it — `shouldApplyMercadoPagoPaymentStatus` lets
 * `cancelled` advance to `completed`, and submission is driven by the order
 * snapshot, so the payment settles against the order it was created for
 * (ADR-0001).
 *
 * Never turns a refusal into an error and never opens its own transaction: it
 * always runs inside the caller's `$transaction`, and the caller decides what a
 * `blocked*` decision means for it.
 */
export async function releaseCheckoutCart(
	database: CheckoutDbClient,
	cart: { id: number; status: CartStatus },
): Promise<CheckoutReleaseOutcome> {
	const liveOrder =
		cart.status === "atCheckout"
			? await findLiveOrderByCartId(database, cart.id)
			: null;
	const latestAttempt = liveOrder?.transactions[0] ?? null;
	const decision = decideCheckoutRelease({
		cartStatus: cart.status,
		latestAttempt,
	});

	if (decision !== "release") return { decision, cart: null };

	if (liveOrder) {
		if (latestAttempt?.status === "pending") {
			await cancelTransaction(database, latestAttempt.id);
		}
		await updateOrderStatus(database, liveOrder.id, "cancelled");
	}

	return {
		decision,
		cart: await updateCartStatus(database, cart.id, "pending"),
	};
}
