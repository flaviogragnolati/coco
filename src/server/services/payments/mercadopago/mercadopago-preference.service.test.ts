import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	search: vi.fn(),
	get: vi.fn(),
	create: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("~/lib/mercadopago/client", () => ({
	createMercadoPagoClient: () => ({}),
}));
vi.mock("mercadopago", () => ({
	Preference: class {
		search = mocks.search;
		get = mocks.get;
		create = mocks.create;
	},
}));

import {
	createMercadoPagoPreference,
	recoverMercadoPagoPreference,
} from "./mercadopago-preference.service";

const attempt = {
	id: 50,
	amount: "500.00",
	currency: "ARS",
	providerPreferenceId: null as string | null,
	expiresAt: new Date(Date.now() + 120_000),
};
function preference(overrides: Record<string, unknown> = {}) {
	return {
		id: "pref-50",
		external_reference: "user_transaction:50",
		expires: true,
		expiration_date_to: new Date(Date.now() + 60_000).toISOString(),
		items: [{ unit_price: 250, quantity: 2, currency_id: "ARS" }],
		init_point: "https://mp.test/50",
		sandbox_init_point: "https://sandbox.mp.test/50",
		...overrides,
	};
}
beforeEach(() => {
	vi.resetAllMocks();
	mocks.search.mockResolvedValue({
		total: 1,
		elements: [{ id: "pref-50", external_reference: "user_transaction:50" }],
	});
	mocks.get.mockResolvedValue(preference());
});

describe("preference recovery", () => {
	it("recovers a matching unexpired preference by attempt reference without creating one", async () => {
		const result = await recoverMercadoPagoPreference(attempt);
		expect(mocks.search).toHaveBeenCalledWith({
			options: { external_reference: "user_transaction:50", limit: 2 },
		});
		expect(mocks.get).toHaveBeenCalledWith({ preferenceId: "pref-50" });
		expect(result).toMatchObject({
			providerPreferenceId: "pref-50",
			checkoutUrl: "https://mp.test/50",
			sandboxCheckoutUrl: "https://sandbox.mp.test/50",
			externalReference: "user_transaction:50",
			expiresAt: expect.any(Date),
		});
		expect(mocks.create).not.toHaveBeenCalled();
	});

	it("fetches a known preference directly when only its URLs were lost", async () => {
		await recoverMercadoPagoPreference({
			...attempt,
			providerPreferenceId: "pref-50",
		});
		expect(mocks.search).not.toHaveBeenCalled();
		expect(mocks.get).toHaveBeenCalledWith({ preferenceId: "pref-50" });
	});

	it.each([
		{ total: 0, elements: [] },
		{
			total: 2,
			elements: [{ id: "pref-50", external_reference: "user_transaction:50" }],
		},
		{
			total: 1,
			elements: [{ id: "pref-51", external_reference: "user_transaction:51" }],
		},
	])("keeps an ambiguous or absent result unresolved: %j", async (search) => {
		mocks.search.mockResolvedValue(search);
		await expect(recoverMercadoPagoPreference(attempt)).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
		});
		expect(mocks.get).not.toHaveBeenCalled();
		expect(mocks.create).not.toHaveBeenCalled();
	});

	it.each([
		{ id: "other-preference" },
		{ external_reference: "user_transaction:51" },
		{ items: [{ unit_price: 499, quantity: 1, currency_id: "ARS" }] },
		{ items: [{ unit_price: 500, quantity: 1, currency_id: "USD" }] },
		{ items: [{ unit_price: 500, quantity: 0, currency_id: "ARS" }] },
		{ items: [] },
		{ expires: false },
		{ expiration_date_to: "invalid" },
		{ expiration_date_to: new Date(0).toISOString() },
		{ expiration_date_to: new Date(Date.now() + 180_000).toISOString() },
		{ init_point: null, sandbox_init_point: null },
	])("refuses a preference that cannot safely resume the attempt: %j", async (overrides) => {
		mocks.get.mockResolvedValue(preference(overrides));
		await expect(recoverMercadoPagoPreference(attempt)).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
		});
		expect(mocks.create).not.toHaveBeenCalled();
	});

	it.each([
		"search",
		"get",
	] as const)("does not create a replacement when %s fails", async (method) => {
		mocks[method].mockRejectedValueOnce(new Error("provider unavailable"));
		await expect(recoverMercadoPagoPreference(attempt)).rejects.toThrow(
			"provider unavailable",
		);
		expect(mocks.create).not.toHaveBeenCalled();
	});
});

it("creates with the expiry already persisted on the attempt", async () => {
	const expiresAt = new Date(Date.now() + 30_000);
	mocks.create.mockResolvedValue(preference());
	const result = await createMercadoPagoPreference({
		transaction: { ...attempt, expiresAt },
		order: { id: 70, code: "ORD-70", user: { email: "test@example.com" } },
		cart: {
			cartItems: [
				{
					quantity: "1",
					productClientTerms: {
						moq: "1",
						moqPrice: "500",
						currency: "ARS",
						product: { id: 9, name: "Test product" },
					},
				},
			],
		} as never,
		config: {
			settings: {
				preferenceExpiresInMinutes: 60,
				successBackUrl: "https://coco.test/success",
				failureBackUrl: "https://coco.test/failure",
				pendingBackUrl: "https://coco.test/pending",
				notificationUrl: "https://coco.test/api/mercadopago/webhook",
				autoReturnApproved: true,
				binaryMode: false,
				excludedPaymentTypes: [],
				excludedPaymentMethods: [],
				statementDescriptor: null,
			},
		} as never,
	});
	expect(result.expiresAt).toEqual(expiresAt);
	expect(mocks.create).toHaveBeenCalledWith(
		expect.objectContaining({
			body: expect.objectContaining({
				expiration_date_to: expiresAt.toISOString(),
				external_reference: "user_transaction:50",
			}),
			requestOptions: {
				idempotencyKey: "mercadopago:preference:userTransaction:50",
			},
		}),
	);
});

it("does not create a preference before its deadline is persisted", async () => {
	await expect(
		createMercadoPagoPreference({
			transaction: { ...attempt, expiresAt: null },
			order: { id: 70, code: "ORD-70", user: { email: "test@example.com" } },
			cart: {} as never,
			config: {} as never,
		}),
	).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
	expect(mocks.create).not.toHaveBeenCalled();
});
