import "server-only";

import type { CatalogCurrency } from "~/shared/common/catalog.types";
import type { CheckoutPaymentStatus } from "~/shared/common/checkout.types";

export type PaymentGatewayRequest = {
	idempotencyKey: string;
	userId: string;
	cartId: number;
	cartCode: string;
	orderId: number;
	orderCode: string;
	transactionId: number;
	amount: string;
	currency: CatalogCurrency;
	paymentMethod: {
		id: number;
		type: string;
		label: string;
		details: string;
		provider: string;
		externalPaymentMethodId: string | null;
	};
};

export type PaymentGatewayResponse = {
	status: CheckoutPaymentStatus;
	provider: string;
	providerStatus: string;
	externalTransactionId: string | null;
	failureCode: string | null;
	failureMessage: string | null;
	raw: Record<string, unknown>;
};

export type PaymentGatewayPort = {
	capturePayment(
		request: PaymentGatewayRequest,
	): Promise<PaymentGatewayResponse>;
};

export class MockPaymentGateway implements PaymentGatewayPort {
	async capturePayment(
		request: PaymentGatewayRequest,
	): Promise<PaymentGatewayResponse> {
		await new Promise((resolve) => setTimeout(resolve, 350));

		const searchableText = [
			request.paymentMethod.label,
			request.paymentMethod.details,
			request.paymentMethod.externalPaymentMethodId,
		]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();

		if (
			searchableText.includes("fail") ||
			searchableText.includes("error") ||
			searchableText.includes("rechazo")
		) {
			return {
				status: "failed",
				provider: "mock",
				providerStatus: "rejected",
				externalTransactionId: `mock-failed-${request.transactionId}`,
				failureCode: "mock_rejected",
				failureMessage: "El proveedor mock rechazó el pago.",
				raw: {
					mock: true,
					reason: "forced_failure",
					transactionId: request.transactionId,
				},
			};
		}

		return {
			status: "succeeded",
			provider: "mock",
			providerStatus: "approved",
			externalTransactionId: `mock-approved-${request.transactionId}`,
			failureCode: null,
			failureMessage: null,
			raw: {
				mock: true,
				authorizationCode: `AUTH-${crypto.randomUUID().slice(0, 8)}`,
				transactionId: request.transactionId,
			},
		};
	}
}

export const paymentGateway = new MockPaymentGateway();
