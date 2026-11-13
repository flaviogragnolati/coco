import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
	createPendingTransaction,
	updateTransactionWithMercadoPagoPreference,
} from "./checkout.data";

it("persists the preference deadline with the pending attempt", async () => {
	const expiresAt = new Date(Date.now() + 60_000);
	const create = vi.fn(async () => ({ id: 50, expiresAt }));
	await createPendingTransaction({ userTransaction: { create } } as never, {
		amount: "500.00",
		currency: "ARS",
		idempotencyKey: "test-key",
		paymentMethodId: 1,
		userOrderId: 70,
		requestSnapshot: {},
		provider: "mercadopago",
		providerMode: "sandbox",
		expiresAt,
	});
	expect(create).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({
				status: "pending",
				expiresAt,
				amount: "500.00",
				userOrderId: 70,
			}),
		}),
	);
});

it("a recovered preference cannot overwrite a payment that completed during lookup", async () => {
	const latest = {
		id: 50,
		status: "completed",
		providerStatus: "approved",
		responseSnapshot: { source: "mercadopago.payment.get" },
	};
	const updateMany = vi.fn(
		async (_input: { data: Record<string, unknown> }) => ({ count: 0 }),
	);
	const findUniqueOrThrow = vi.fn(async () => latest);
	const result = await updateTransactionWithMercadoPagoPreference(
		{ userTransaction: { updateMany, findUniqueOrThrow } } as never,
		{
			id: 50,
			providerMode: "sandbox",
			onlyIfPending: true,
			providerPreferenceId: "pref-50",
			checkoutUrl: "https://mp.test/50",
			sandboxCheckoutUrl: null,
			expiresAt: new Date(Date.now() + 60_000),
			externalReference: "user_transaction:50",
			responseSnapshot: {},
		},
	);
	expect(updateMany).toHaveBeenCalledWith(
		expect.objectContaining({
			where: {
				id: 50,
				provider: "mercadopago",
				status: "pending",
				providerPaymentId: null,
			},
		}),
	);
	expect(result).toBe(latest);
	const args = updateMany.mock.calls[0]?.[0];
	expect(args?.data).not.toHaveProperty("requestSnapshot");
	expect(args?.data).not.toHaveProperty("status");
});
