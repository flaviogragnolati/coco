import "server-only";

import { env } from "~/env";
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

/**
 * Stands in for the mock gateway in production, where approving a payment
 * without a real provider would hand out free goods (finding #26). It fails the
 * capture instead of throwing, so the order lands in the existing `failed`
 * branch and the user sees a payment failure rather than a crash.
 */
export class UnavailableGateway implements PaymentGatewayPort {
	async capturePayment(): Promise<PaymentGatewayResponse> {
		return {
			status: "failed",
			provider: "unavailable",
			providerStatus: "unavailable",
			externalTransactionId: null,
			failureCode: "gateway_unavailable",
			failureMessage:
				"No hay un proveedor de pagos configurado para este método.",
			raw: { reason: "no_production_gateway" },
		};
	}
}

export const paymentGateway: PaymentGatewayPort =
	env.APP_ENV === "production"
		? new UnavailableGateway()
		: new MockPaymentGateway();
