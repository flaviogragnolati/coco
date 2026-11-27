import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	get: vi.fn(),
	transaction: vi.fn(),
	findAttempt: vi.fn(),
	updateAttempt: vi.fn(),
	findDetail: vi.fn(),
	updateEvent: vi.fn(),
	submit: vi.fn(),
	wake: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("mercadopago", () => ({
	Payment: class {
		get = mocks.get;
	},
}));
vi.mock("~/lib/mercadopago/client", () => ({
	createMercadoPagoClient: () => ({}),
}));
vi.mock("~/server/db", () => ({ db: { $transaction: mocks.transaction } }));
vi.mock("~/server/events/domain-event-dispatcher", () => ({
	DomainEventDispatcher: { wake: mocks.wake },
}));
vi.mock("~/server/services/payments/payment.data", () => ({
	findPaymentAttemptById: mocks.findDetail,
	findPaymentEventById: vi.fn(),
	updatePaymentProviderEventStatus: mocks.updateEvent,
}));
vi.mock("../order-submission.service", () => ({
	submitOrderForCompletedPayment: mocks.submit,
}));
vi.mock("./mercadopago-config.service", () => ({
	MERCADOPAGO_PROVIDER: "mercadopago",
}));

import { reconcileMercadoPagoPayment } from "./mercadopago-reconciliation.service";

const tx = {
	userTransaction: {
		findFirst: mocks.findAttempt,
		update: mocks.updateAttempt,
	},
	userOrder: { update: vi.fn() },
};
function initialAttempt() {
	return {
		id: 50,
		userOrderId: 70,
		userOrder: { id: 70, cartId: 1, status: "pending" },
		amount: "500.00",
		currency: "ARS",
		status: "pending",
		completedAt: null as Date | null,
		cancelledAt: null,
		providerPaymentId: null,
		externalTransactionId: null,
		failureCode: null as string | null,
		failureMessage: null as string | null,
	};
}
let attempt = initialAttempt();
let boundaries: string[];
function payment(overrides: Record<string, unknown> = {}) {
	return {
		id: 123,
		external_reference: "user_transaction:50",
		status: "approved",
		status_detail: "accredited",
		transaction_amount: 500,
		currency_id: "ARS",
		date_approved: "2026-11-13T12:00:00Z",
		...overrides,
	};
}

beforeEach(() => {
	vi.resetAllMocks();
	attempt = initialAttempt();
	boundaries = [];
	mocks.get.mockResolvedValue(payment());
	mocks.findAttempt.mockImplementation(async () => ({ ...attempt }));
	mocks.updateAttempt.mockImplementation(async ({ data }) => {
		Object.assign(attempt, data);
		return { ...attempt };
	});
	mocks.findDetail.mockImplementation(async () => ({ ...attempt }));
	mocks.transaction.mockImplementation(async (run) => {
		const before = { ...attempt };
		boundaries.push("begin");
		try {
			const result = await run(tx);
			boundaries.push("commit");
			return result;
		} catch (error) {
			attempt = before;
			boundaries.push("rollback");
			throw error;
		}
	});
	mocks.wake.mockImplementation(async () => {
		boundaries.push("wake");
	});
});

describe("Mercado Pago reconciliation service", () => {
	it("fetches the authoritative payment, submits inside the transaction and wakes after commit", async () => {
		await reconcileMercadoPagoPayment({ paymentId: "123", eventId: 7 });
		expect(mocks.get).toHaveBeenCalledWith({ id: "123" });
		expect(mocks.findAttempt).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					provider: "mercadopago",
					OR: [{ id: 50 }, { providerPaymentId: "123" }],
				},
			}),
		);
		expect(attempt).toMatchObject({
			status: "completed",
			providerPaymentId: "123",
			completedAt: new Date("2026-11-13T12:00:00Z"),
		});
		expect(mocks.submit).toHaveBeenCalledWith(tx, {
			orderId: 70,
			orderStatus: "pending",
			cartId: 1,
			transactionId: 50,
			actor: { source: "system", actorReference: "mercadopago" },
		});
		expect(mocks.updateEvent).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				id: 7,
				status: "processed",
				userTransactionId: 50,
				lastError: null,
				processedAt: expect.any(Date),
			}),
		);
		expect(boundaries).toEqual(["begin", "commit", "wake"]);
	});

	it.each([
		["rejected", "failed"],
		["pending", "pending"],
		["in_process", "inProcess"],
	])("maps %s to %s without submission", async (providerStatus, localStatus) => {
		mocks.get.mockResolvedValue(payment({ status: providerStatus }));
		await reconcileMercadoPagoPayment({ paymentId: "123", eventId: 7 });
		expect(attempt.status).toBe(localStatus);
		expect(mocks.submit).not.toHaveBeenCalled();
		expect(mocks.wake).not.toHaveBeenCalled();
	});

	it.each([
		[{ transaction_amount: 499 }, "mp_amount_mismatch"],
		[{ currency_id: "USD" }, "mp_currency_mismatch"],
		[{ transaction_amount: undefined }, "mp_missing_amount"],
		[{ transaction_amount_refunded: 1 }, "mp_partially_refunded"],
	] as const)("withholds approval for a discrepancy %j", async (overrides, code) => {
		mocks.get.mockResolvedValue(payment(overrides));
		await reconcileMercadoPagoPayment({ paymentId: "123", eventId: 7 });
		expect(attempt).toMatchObject({
			status: "pending",
			completedAt: null,
			failureCode: code,
		});
		expect(mocks.updateEvent).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				status: "failed",
				userTransactionId: 50,
				lastError: expect.any(String),
			}),
		);
		expect(mocks.submit).not.toHaveBeenCalled();
		expect(mocks.wake).not.toHaveBeenCalled();
	});

	it("heals an amount discrepancy only after a matching re-fetch", async () => {
		mocks.get.mockResolvedValueOnce(payment({ transaction_amount: 499 }));
		await reconcileMercadoPagoPayment({ paymentId: "123", eventId: 7 });
		await reconcileMercadoPagoPayment({ paymentId: "123", eventId: 7 });
		expect(attempt).toMatchObject({
			status: "completed",
			failureCode: null,
			failureMessage: null,
		});
		expect(mocks.submit).toHaveBeenCalledTimes(1);
	});

	it("does not submit or dispatch twice on sequential replay", async () => {
		for (let i = 0; i < 3; i++)
			await reconcileMercadoPagoPayment({ paymentId: "123", eventId: 7 });
		expect(mocks.get).toHaveBeenCalledTimes(3);
		expect(mocks.submit).toHaveBeenCalledTimes(1);
		expect(mocks.wake).toHaveBeenCalledTimes(1);
		expect(attempt.status).toBe("completed");
	});

	it.each([
		"completed",
		"refunded",
		"chargedBack",
	])("does not degrade %s on an older pending notification", async (status) => {
		attempt.status = status;
		attempt.completedAt = new Date("2026-11-13T12:00:00Z");
		mocks.get.mockResolvedValue(payment({ status: "pending" }));
		await reconcileMercadoPagoPayment({ paymentId: "123", eventId: 7 });
		expect(attempt.status).toBe(status);
		expect(mocks.submit).not.toHaveBeenCalled();
		expect(mocks.wake).not.toHaveBeenCalled();
	});

	it("fails an unlinked payment and records the failure outside the rolled back transaction", async () => {
		mocks.findAttempt.mockResolvedValue(null);
		await expect(
			reconcileMercadoPagoPayment({ paymentId: "123", eventId: 7 }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(mocks.updateEvent).toHaveBeenCalledWith(
			expect.not.objectContaining({ userTransaction: expect.anything() }),
			expect.objectContaining({ id: 7, status: "failed" }),
		);
		expect(boundaries).toEqual(["begin", "rollback"]);
		expect(mocks.submit).not.toHaveBeenCalled();
	});

	it("records an API failure without starting a payment transaction", async () => {
		mocks.get.mockRejectedValue(new Error("API unavailable"));
		await expect(
			reconcileMercadoPagoPayment({ paymentId: "123", eventId: 7 }),
		).rejects.toThrow("API unavailable");
		expect(mocks.transaction).not.toHaveBeenCalled();
		expect(mocks.updateEvent).toHaveBeenCalledWith(expect.anything(), {
			id: 7,
			status: "failed",
			lastError: "API unavailable",
		});
		expect(mocks.submit).not.toHaveBeenCalled();
	});

	it("rolls back approval when submission fails and retries the payment on redelivery", async () => {
		mocks.submit.mockRejectedValueOnce(new Error("submission unavailable"));
		await expect(
			reconcileMercadoPagoPayment({ paymentId: "123", eventId: 7 }),
		).rejects.toThrow("submission unavailable");
		expect(attempt.status).toBe("pending");
		expect(mocks.wake).not.toHaveBeenCalled();
		await reconcileMercadoPagoPayment({ paymentId: "123", eventId: 7 });
		expect(attempt.status).toBe("completed");
		expect(boundaries).toEqual([
			"begin",
			"rollback",
			"begin",
			"commit",
			"wake",
		]);
	});
});
