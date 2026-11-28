/**
 * How a payment method reads on customer screens. Keyed by provider, never by
 * the stored `label`: the external method is saved as "Pago externo", the
 * admin's word, and as a `bank_transfer` type the customer has no business
 * seeing (CONTEXT.md, "External payment").
 */
const PAYMENT_PROVIDER_COPY = {
	mercadopago: {
		title: "Mercado Pago",
		description:
			"Tarjeta, dinero en cuenta o efectivo. Pagás en Mercado Pago y volvés a CoCo.",
	},
	external: {
		title: "Transferencia bancaria",
		description:
			"Te damos los datos al confirmar. Tu pedido queda confirmado cuando verificamos la transferencia.",
	},
} as const;

export type PaymentMethodCopy = { title: string; description: string };

/** A provider this file does not know falls back to what the method stores. */
export function paymentMethodCopy(paymentMethod: {
	provider: string;
	label: string;
	details: string;
}): PaymentMethodCopy {
	return (
		PAYMENT_PROVIDER_COPY[
			paymentMethod.provider as keyof typeof PAYMENT_PROVIDER_COPY
		] ?? { title: paymentMethod.label, description: paymentMethod.details }
	);
}
