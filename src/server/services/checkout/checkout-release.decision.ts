import type { CartStatus } from "~/shared/common/cart.types";
import {
	isCancellablePaymentAttempt,
	type PaymentAttemptStatus,
} from "./payment-attempt.decision";

export type CheckoutReleaseDecision =
	| "notAtCheckout"
	| "release"
	| "blockedPaymentInFlight"
	| "blockedDeclaredReceipt";

export type CheckoutReleaseBlockedDecision = Extract<
	CheckoutReleaseDecision,
	"blockedPaymentInFlight" | "blockedDeclaredReceipt"
>;

export type CheckoutReleaseInput = {
	cartStatus: CartStatus;
	latestAttempt: {
		status: PaymentAttemptStatus;
		declaredReceiptReference: string | null;
	} | null;
};

/**
 * Whether a cart may leave `atCheckout` and become editable again. Both the
 * explicit `checkout.leave` and the automatic release a cart mutation performs
 * ask this same question, so an abandoned checkout can never be treated as
 * releasable on one path and frozen on the other.
 *
 * A cart at checkout with no attempt yet is always releasable: nobody is
 * holding money for it.
 */
export function decideCheckoutRelease(
	input: CheckoutReleaseInput,
): CheckoutReleaseDecision {
	if (input.cartStatus !== "atCheckout") return "notAtCheckout";

	const attempt = input.latestAttempt;
	if (attempt === null) return "release";

	// Asked before the declared-receipt branch on purpose: a failed or cancelled
	// attempt stays cancellable even with a receipt reference on it, and
	// `isCancellablePaymentAttempt` is the authority on that (ADR 0010).
	if (isCancellablePaymentAttempt(attempt)) return "release";

	if (attempt.declaredReceiptReference !== null)
		return "blockedDeclaredReceipt";

	return "blockedPaymentInFlight";
}

/**
 * The customer-facing reason a cart stays frozen. Shared so `checkout.leave`
 * and a blocked cart mutation answer with the exact same wording.
 */
export function checkoutReleaseBlockedMessage(
	decision: CheckoutReleaseBlockedDecision,
) {
	return decision === "blockedDeclaredReceipt"
		? "Ya informaste una transferencia para este pedido. Esperá a que la confirmemos antes de volver al carrito."
		: "Hay un pago en curso para este carrito. Esperá a que el proveedor lo resuelva.";
}
