import { describe, expect, test } from "vitest";

import type { CartStatus } from "~/shared/common/cart.types";
import {
	checkoutReleaseBlockedMessage,
	decideCheckoutRelease,
} from "./checkout-release.decision";
import type { PaymentAttemptStatus } from "./payment-attempt.decision";

const ALL_STATUSES: PaymentAttemptStatus[] = [
	"pending",
	"inProcess",
	"completed",
	"failed",
	"cancelled",
	"refunded",
	"chargedBack",
];

const CANCELLABLE: PaymentAttemptStatus[] = ["pending", "failed", "cancelled"];

const NON_CHECKOUT_STATUSES: CartStatus[] = [
	"draft",
	"pending",
	"submitted",
	"abandoned",
	"cancelled",
	"aborted",
];

function atCheckout(
	status: PaymentAttemptStatus,
	declaredReceiptReference: string | null = null,
) {
	return decideCheckoutRelease({
		cartStatus: "atCheckout",
		latestAttempt: { status, declaredReceiptReference },
	});
}

describe("decideCheckoutRelease", () => {
	test("a cart that is not at checkout has nothing to release", () => {
		for (const cartStatus of NON_CHECKOUT_STATUSES) {
			expect(decideCheckoutRelease({ cartStatus, latestAttempt: null })).toBe(
				"notAtCheckout",
			);
		}
	});

	// Idempotence: the second tab of a double release finds the cart already back.
	test("a cart already back at pending is reported as not at checkout", () => {
		expect(
			decideCheckoutRelease({
				cartStatus: "pending",
				latestAttempt: { status: "inProcess", declaredReceiptReference: null },
			}),
		).toBe("notAtCheckout");
	});

	// The abandoned-checkout case: cart frozen at checkout, no attempt ever made.
	test("a checkout with no attempt is always releasable", () => {
		expect(
			decideCheckoutRelease({
				cartStatus: "atCheckout",
				latestAttempt: null,
			}),
		).toBe("release");
	});

	test("a cancellable attempt releases the cart", () => {
		for (const status of CANCELLABLE) {
			expect(atCheckout(status)).toBe("release");
		}
	});

	test("an attempt the provider still holds blocks the cart", () => {
		for (const status of ALL_STATUSES.filter(
			(candidate) => !CANCELLABLE.includes(candidate),
		)) {
			expect(atCheckout(status)).toBe("blockedPaymentInFlight");
		}
	});

	// ADR 0010: the transfer is waiting on an admin, not on the customer.
	test("a declared receipt on a pending attempt blocks with its own reason", () => {
		expect(atCheckout("pending", "REF-9001")).toBe("blockedDeclaredReceipt");
	});

	test("a declared receipt outranks the in-flight reason on every held attempt", () => {
		for (const status of ALL_STATUSES.filter(
			(candidate) => !CANCELLABLE.includes(candidate),
		)) {
			expect(atCheckout(status, "REF-9001")).toBe("blockedDeclaredReceipt");
		}
	});

	// Precedence guardrail: `isCancellablePaymentAttempt` is asked first, so a
	// dead attempt stays releasable even with a receipt reference on it.
	test("a dead attempt releases even when a receipt was declared", () => {
		expect(atCheckout("failed", "REF-9001")).toBe("release");
		expect(atCheckout("cancelled", "REF-9001")).toBe("release");
	});

	test("every attempt status resolves to exactly one decision", () => {
		for (const status of ALL_STATUSES) {
			for (const reference of [null, "REF-9001"]) {
				expect([
					"release",
					"blockedPaymentInFlight",
					"blockedDeclaredReceipt",
				]).toContain(atCheckout(status, reference));
			}
		}
	});
});

// QA traces tickets 3 and 10 by quoting these strings; they are contract.
describe("checkoutReleaseBlockedMessage", () => {
	test("the in-flight payment message is unchanged", () => {
		expect(checkoutReleaseBlockedMessage("blockedPaymentInFlight")).toBe(
			"Hay un pago en curso para este carrito. Esperá a que el proveedor lo resuelva.",
		);
	});

	test("the declared receipt message is unchanged", () => {
		expect(checkoutReleaseBlockedMessage("blockedDeclaredReceipt")).toBe(
			"Ya informaste una transferencia para este pedido. Esperá a que la confirmemos antes de volver al carrito.",
		);
	});
});
