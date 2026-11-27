import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	config: vi.fn(),
	reconcile: vi.fn(),
	record: vi.fn(),
	logError: vi.fn(),
	env: { APP_ENV: "test", MERCADOPAGO_WEBHOOK_SECRET: "test-webhook-secret" },
}));
vi.mock("server-only", () => ({}));
vi.mock("~/env", () => ({ env: mocks.env }));
vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("~/server/services/logging/app-logger.service", () => ({
	appLogger: { error: mocks.logError },
}));
vi.mock(
	"~/server/services/payments/mercadopago/mercadopago-config.service",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		getMercadoPagoConfig: mocks.config,
	}),
);
vi.mock(
	"~/server/services/payments/mercadopago/mercadopago-reconciliation.service",
	() => ({ reconcileMercadoPagoPayment: mocks.reconcile }),
);
vi.mock("~/server/services/payments/payment.data", () => ({
	createPaymentProviderEvent: mocks.record,
}));

import { POST } from "./route";

function request(
	input: {
		signature?: "valid" | "invalid" | "missing" | "stale";
		type?: string;
		seconds?: boolean;
		queryId?: string;
		bodyId?: string;
	} = {},
) {
	const {
		signature = "valid",
		type = "payment",
		queryId = "123",
		bodyId = "999",
	} = input;
	const time = Date.now() - (signature === "stale" ? 600_000 : 0);
	const ts = String(input.seconds ? Math.floor(time / 1000) : time);
	const digest = createHmac("sha256", "test-webhook-secret")
		.update(`id:${queryId};request-id:request-1;ts:${ts};`)
		.digest("hex");
	return new NextRequest(
		`https://coco.test/api/mercadopago/webhook?type=${type}&data.id=${queryId}`,
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-request-id": "request-1",
				...(signature === "missing"
					? {}
					: {
							"x-signature": `ts=${ts},v1=${signature === "invalid" ? "0".repeat(64) : digest}`,
						}),
			},
			body: JSON.stringify({
				id: "event-1",
				type,
				action: "payment.updated",
				data: { id: bodyId },
				status: "approved",
			}),
		},
	);
}

beforeEach(() => {
	vi.resetAllMocks();
	mocks.env.MERCADOPAGO_WEBHOOK_SECRET = "test-webhook-secret";
	mocks.config.mockResolvedValue({
		mode: "sandbox",
		settings: { allowUnsignedWebhooksInDevelopment: false },
	});
	mocks.record.mockResolvedValue({ id: 7 });
});

describe("Mercado Pago webhook POST", () => {
	it.each([
		"invalid",
		"missing",
		"stale",
	] as const)("rejects a %s signature before reconciliation", async (signature) => {
		const response = await POST(request({ signature }));
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "invalid signature" });
		expect(mocks.record).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				status: "rejected",
				signatureValid: false,
				providerResourceId: "123",
			}),
		);
		expect(mocks.reconcile).not.toHaveBeenCalled();
	});

	it.each([
		["valid", 200],
		["invalid", 401],
		["stale", 401],
	] as const)("handles a %s signature with the provider timestamp in seconds", async (signature, expected) => {
		const response = await POST(request({ signature, seconds: true }));
		expect(response.status).toBe(expected);
		expect(mocks.reconcile).toHaveBeenCalledTimes(expected === 200 ? 1 : 0);
	});

	it("rejects when the deployment has no webhook secret", async () => {
		mocks.env.MERCADOPAGO_WEBHOOK_SECRET = "";
		expect((await POST(request())).status).toBe(401);
		expect(mocks.reconcile).not.toHaveBeenCalled();
	});

	it("validates a real SDK-compatible HMAC and uses the signed query resource", async () => {
		const response = await POST(request());
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ received: true });
		expect(mocks.record).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				status: "received",
				signatureValid: true,
				providerEventId: "event-1",
				providerResourceId: "123",
				providerRequestId: "request-1",
			}),
		);
		expect(mocks.reconcile).toHaveBeenCalledWith({
			paymentId: "123",
			eventId: 7,
		});
		expect(mocks.record.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.reconcile.mock.invocationCallOrder[0] as number,
		);
	});

	it("returns 500 on reconciliation failure and accepts redelivery", async () => {
		mocks.reconcile.mockRejectedValueOnce(new Error("provider unavailable"));
		expect((await POST(request())).status).toBe(500);
		expect((await POST(request())).status).toBe(200);
		expect(mocks.record).toHaveBeenCalledTimes(2);
		expect(mocks.reconcile).toHaveBeenCalledTimes(2);
		expect(mocks.logError).toHaveBeenCalledTimes(1);
	});

	it("records a signed non-payment notification without reconciling", async () => {
		expect((await POST(request({ type: "merchant_order" }))).status).toBe(200);
		expect(mocks.record).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				eventType: "merchant_order",
				signatureValid: true,
			}),
		);
		expect(mocks.reconcile).not.toHaveBeenCalled();
	});
});
