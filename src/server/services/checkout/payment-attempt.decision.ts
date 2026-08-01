export type PaymentAttemptStatus =
	| "pending"
	| "inProcess"
	| "completed"
	| "failed"
	| "cancelled"
	| "refunded"
	| "chargedBack";

/**
 * Whether confirming again should mint a new attempt on the live order. Only a
 * dead attempt qualifies — failed, cancelled, or a pending one whose provider
 * window has closed. Every other state (completed, in process, still-payable
 * pending, refunded, charged back) is answered with the attempt that exists,
 * which is what makes a browser-back re-confirm idempotent.
 */
export function isSpentPaymentAttempt(
	attempt: { status: PaymentAttemptStatus; expiresAt: Date | null },
	now: Date,
) {
	if (attempt.status === "failed" || attempt.status === "cancelled") {
		return true;
	}
	if (attempt.status !== "pending") return false;
	return attempt.expiresAt !== null && attempt.expiresAt <= now;
}

/**
 * Whether abandoning the attempt is still the user's call. A payment the
 * provider is holding, or one that already took money, is not. Neither is an
 * external attempt whose transfer the user already reported: the declared
 * receipt is waiting on an admin, and cancelling it would strand a transfer
 * that may already have landed (ADR 0010).
 */
export function isCancellablePaymentAttempt(attempt: {
	status: PaymentAttemptStatus;
	declaredReceiptReference: string | null;
}) {
	if (attempt.status === "pending") {
		return attempt.declaredReceiptReference === null;
	}

	return attempt.status === "failed" || attempt.status === "cancelled";
}
