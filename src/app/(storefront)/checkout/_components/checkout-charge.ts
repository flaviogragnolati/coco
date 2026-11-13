import type { CartSnapshot } from "~/shared/common/cart.types";
import type { CheckoutPaymentMethod } from "~/shared/common/checkout.types";
import { decideAttemptCharge } from "~/shared/common/transfer-discount";

/**
 * What confirming would charge with the chosen method: the figure the screens
 * show and the `expectedAmount` confirmation sends. Null until a method is
 * chosen, or for a cart in several currencies, which checkout refuses anyway.
 */
export function getCheckoutCharge(
	cart: CartSnapshot,
	paymentMethod: CheckoutPaymentMethod | null | undefined,
	transferDiscountPercent: number | null,
) {
	const total = cart.totals[0];
	if (!paymentMethod || !total || cart.totals.length !== 1) return null;

	return decideAttemptCharge({
		provider: paymentMethod.provider,
		subtotal: total.amount,
		currency: total.currency,
		transferDiscountPercent,
	});
}
