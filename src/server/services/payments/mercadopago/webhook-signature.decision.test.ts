import { expect, test } from "vitest";

import {
	resolveWebhookSignatureOutcome,
	type WebhookSignatureInput,
} from "./webhook-signature.decision";

function makeInput(
	overrides: Partial<WebhookSignatureInput> = {},
): WebhookSignatureInput {
	return {
		signatureValid: false,
		canProcessUnsigned: false,
		secretConfigured: true,
		failureReason: null,
		...overrides,
	};
}

test("a valid signature is accepted with no audit message", () => {
	const outcome = resolveWebhookSignatureOutcome(
		makeInput({ signatureValid: true }),
	);
	expect(outcome).toEqual({ accept: true, auditMessage: null });
});

test("an invalid signature is accepted when the development toggle allows it", () => {
	const outcome = resolveWebhookSignatureOutcome(
		makeInput({ canProcessUnsigned: true, failureReason: "SignatureMismatch" }),
	);
	expect(outcome.accept).toBe(true);
	expect(outcome.auditMessage).toContain("configuración de desarrollo");
});

test("an invalid signature is rejected when the toggle is off", () => {
	const outcome = resolveWebhookSignatureOutcome(
		makeInput({ failureReason: "SignatureMismatch" }),
	);
	expect(outcome).toEqual({
		accept: false,
		auditMessage: "Firma inválida: SignatureMismatch",
	});
});

// Finding #36's regression: the old route derived accept from
// `rejectedReason.includes("procesada")`, so this input was accepted.
test("a failure reason containing 'procesada' cannot buy acceptance", () => {
	const outcome = resolveWebhookSignatureOutcome(
		makeInput({
			canProcessUnsigned: false,
			failureReason: "algo procesada",
		}),
	);
	expect(outcome.accept).toBe(false);
});

test("a missing webhook secret gets its own audit message, not a signature mismatch", () => {
	const outcome = resolveWebhookSignatureOutcome(
		makeInput({ secretConfigured: false, failureReason: "SignatureMismatch" }),
	);
	expect(outcome.accept).toBe(false);
	expect(outcome.auditMessage).toContain("MERCADOPAGO_WEBHOOK_SECRET");
	expect(outcome.auditMessage).not.toContain("Firma inválida");
});

test("a missing secret still processes under the development toggle", () => {
	const outcome = resolveWebhookSignatureOutcome(
		makeInput({ secretConfigured: false, canProcessUnsigned: true }),
	);
	expect(outcome.accept).toBe(true);
});

test("an unrecognised failure falls back to the generic audit message", () => {
	const outcome = resolveWebhookSignatureOutcome(makeInput());
	expect(outcome).toEqual({ accept: false, auditMessage: "Firma inválida." });
});
