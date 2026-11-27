import { beforeAll, beforeEach, expect, test, vi } from "vitest";

// Rejecting a transfer fails its order only while nothing else paid it: after
// a switch of payment method, a declared transfer can outlive the Mercado Pago
// payment that settled the order (ADR 0013).

const tx = { name: "tx" };

let orderStatus = "pending";

const checkoutData = {
	rejectExternalTransaction: vi.fn(async () => null),
	settleExternalTransaction: vi.fn(),
	updateOrderStatus: vi.fn(async () => null),
};

const paymentData = {
	findPaymentAttemptWithCartById: vi.fn(async () => ({
		id: 62,
		provider: "external",
		status: "pending",
		userOrderId: 70,
		userOrder: { id: 70, code: "ORD-70", cartId: 1, status: orderStatus },
	})),
	findPaymentAttemptById: vi.fn(async () => ({
		id: 62,
		paymentProviderEvents: [],
	})),
	findPaymentEventById: vi.fn(),
	getPaymentStats: vi.fn(),
	listPaymentAttempts: vi.fn(),
	listPaymentEvents: vi.fn(),
	updatePaymentProviderEventStatus: vi.fn(),
};

const { enqueueCustomerEmail } = vi.hoisted(() => ({
	enqueueCustomerEmail: vi.fn(),
}));
vi.mock("~/server/services/notifications/customer-email.data", () => ({
	enqueueCustomerEmail,
}));

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({
	db: { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) },
}));
vi.mock("~/server/events/domain-event-dispatcher", () => ({
	DomainEventDispatcher: { wake: vi.fn() },
}));
vi.mock("../checkout/checkout.data", () => checkoutData);
vi.mock("../payments/payment.data", () => paymentData);
vi.mock("../payments/external/external-payment-config.service", () => ({
	EXTERNAL_PROVIDER: "external",
	getExternalPaymentConfig: vi.fn(),
	upsertExternalPaymentConfig: vi.fn(),
}));
vi.mock("../payments/mercadopago/mercadopago-config.service", () => ({
	getMercadoPagoConfig: vi.fn(),
	upsertMercadoPagoConfig: vi.fn(),
}));
vi.mock("../payments/mercadopago/mercadopago-reconciliation.service", () => ({
	reconcileMercadoPagoAttempt: vi.fn(),
	reprocessMercadoPagoEvent: vi.fn(),
}));
vi.mock("../payments/order-submission.service", () => ({
	submitOrderForCompletedPayment: vi.fn(),
}));
vi.mock("./_base/admin-audit", () => ({ writeAdminAuditLog: vi.fn() }));

let service: typeof import("./payment.service");

beforeAll(async () => {
	service = await import("./payment.service");
});

beforeEach(() => {
	vi.clearAllMocks();
});

const actor = { id: "admin-1", name: "Admin" } as never;

function reject() {
	return (
		service
			.rejectExternalAttempt({ id: 62, reason: "No llegó la plata" }, actor)
			// The audit detail is stubbed, so only the writes before it are asserted.
			.catch(() => undefined)
	);
}

test("rejecting the only transfer of a pending order fails the order", async () => {
	orderStatus = "pending";
	await reject();

	expect(checkoutData.rejectExternalTransaction).toHaveBeenCalled();
	expect(enqueueCustomerEmail).toHaveBeenCalledWith(tx, 70, "rejected/62", {
		kind: "rejected",
		attemptId: 62,
	});
	expect(checkoutData.updateOrderStatus).toHaveBeenCalledWith(tx, 70, "failed");
});

test("rejecting a leftover transfer on a paid order leaves the order as it is", async () => {
	orderStatus = "processing";
	await reject();

	expect(checkoutData.rejectExternalTransaction).toHaveBeenCalled();
	expect(checkoutData.updateOrderStatus).not.toHaveBeenCalled();
	expect(enqueueCustomerEmail).not.toHaveBeenCalled();
});
