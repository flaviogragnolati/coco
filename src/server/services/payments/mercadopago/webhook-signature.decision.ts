export type WebhookSignatureOutcome = {
	accept: boolean;
	auditMessage: string | null;
};

export type WebhookSignatureInput = {
	signatureValid: boolean;
	canProcessUnsigned: boolean;
	secretConfigured: boolean;
	failureReason: string | null;
};

/**
 * `failureReason` is provider-supplied text that reaches the audit message, and is
 * deliberately never read by `accept`. Finding #36: the route used to decide
 * accept-vs-reject with `rejectedReason.includes("procesada")`, so rewording a
 * user-facing sentence — or an SDK upgrade widening `SignatureFailureReason` — could
 * silently flip a security control.
 */
export function resolveWebhookSignatureOutcome(
	input: WebhookSignatureInput,
): WebhookSignatureOutcome {
	if (input.signatureValid) {
		return { accept: true, auditMessage: null };
	}

	if (input.canProcessUnsigned) {
		return {
			accept: true,
			auditMessage:
				"Firma ausente o inválida; procesada por configuración de desarrollo.",
		};
	}

	if (!input.secretConfigured) {
		return {
			accept: false,
			auditMessage:
				"Firma no verificada: falta configurar MERCADOPAGO_WEBHOOK_SECRET.",
		};
	}

	return {
		accept: false,
		auditMessage: input.failureReason
			? `Firma inválida: ${input.failureReason}`
			: "Firma inválida.",
	};
}
