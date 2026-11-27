import {
	isCancellablePaymentAttempt,
	type PaymentAttemptStatus,
} from "./payment-attempt.decision";

/**
 * What confirming does with the live order's open attempt. The amount depends
 * on the payment method (ADR 0013), so an attempt is reused only for the same
 * method; one for another method is replaced while abandoning it is still the
 * customer's call, by the rule "Volver a editar el pedido" follows.
 *
 * Expects an attempt that is not spent (`isSpentPaymentAttempt`).
 */
export function decideOpenAttemptHandling(input: {
	attempt: {
		provider: string;
		status: PaymentAttemptStatus;
		declaredReceiptReference: string | null;
		providerPaymentId?: string | null;
	};
	requestedProvider: string;
}): "reuse" | "replace" {
	if (input.attempt.provider === input.requestedProvider) return "reuse";
	return isCancellablePaymentAttempt(input.attempt) ? "replace" : "reuse";
}
