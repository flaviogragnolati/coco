import { expect, test } from "vitest";

import {
	buildMercadoPagoPreferenceCreateData,
	buildMercadoPagoPreferenceItems,
	calculateMercadoPagoPreferenceTotal,
	MercadoPagoPreferenceInvariantError,
	toMercadoPagoWebhookUrl,
} from "./mercadopago-preference.decision";

const settings = {
	publicBaseUrl: "https://coco-murex.vercel.app",
	notificationUrl: "https://coco-murex.vercel.app/api/mercadopago/webhook",
	successBackUrl: "https://coco-murex.vercel.app/checkout/mercadopago/success",
	failureBackUrl: "https://coco-murex.vercel.app/checkout/mercadopago/failure",
	pendingBackUrl: "https://coco-murex.vercel.app/checkout/mercadopago/pending",
	preferenceExpiresInMinutes: 60,
	autoReturnApproved: true,
	binaryMode: false,
	excludedPaymentTypes: [],
	excludedPaymentMethods: [],
	statementDescriptor: null,
	allowUnsignedWebhooksInDevelopment: false,
};

function buildPreference(
	overrides: Partial<
		Parameters<typeof buildMercadoPagoPreferenceCreateData>[0]
	> = {},
) {
	return buildMercadoPagoPreferenceCreateData({
		lines: [
			{
				id: "10",
				title: "Café",
				requestedQuantity: "12",
				lineTotal: "4500.00",
				currency: "ARS",
			},
		],
		expectedAmount: "4500.00",
		currency: "ARS",
		payerEmail: "buyer@example.com",
		transactionId: 123,
		orderId: 456,
		orderCode: "ORD-456",
		expiresAt: new Date("2026-07-24T13:00:00.000Z"),
		settings,
		...overrides,
	});
}

test("preference items preserve line totals for integer catalog quantities", () => {
	const items = buildMercadoPagoPreferenceItems([
		{
			id: "10",
			title: "Café",
			requestedQuantity: "12",
			lineTotal: "4500.00",
			currency: "ARS",
		},
	]);

	expect(items).toEqual([
		{
			id: "10",
			title: "Café",
			description: "Cantidad solicitada: 12",
			quantity: 1,
			unit_price: 4500,
			currency_id: "ARS",
		},
	]);
	expect(calculateMercadoPagoPreferenceTotal(items)).toBe("4500.00");
});

test("fractional requested quantities cannot drift the charged total", () => {
	const items = buildMercadoPagoPreferenceItems([
		{
			id: "11",
			title: "Producto por peso",
			requestedQuantity: "2.75",
			lineTotal: "1234.56",
			currency: "ARS",
		},
	]);

	expect(items[0]).toMatchObject({
		description: "Cantidad solicitada: 2.75",
		quantity: 1,
		unit_price: 1234.56,
	});
	expect(calculateMercadoPagoPreferenceTotal(items)).toBe("1234.56");
});

test("multiple preference lines sum to the snapshotted checkout total", () => {
	const items = buildMercadoPagoPreferenceItems([
		{
			id: "1",
			title: "A",
			requestedQuantity: "1",
			lineTotal: "1000.10",
			currency: "ARS",
		},
		{
			id: "2",
			title: "B",
			requestedQuantity: "3.5",
			lineTotal: "2500.25",
			currency: "ARS",
		},
	]);

	expect(calculateMercadoPagoPreferenceTotal(items)).toBe("3500.35");
});

test("preference creation rejects a total mismatch before the provider call", () => {
	expect(() => buildPreference({ expectedAmount: "4500.01" })).toThrow(
		MercadoPagoPreferenceInvariantError,
	);
});

test("preference creation rejects a currency mismatch before the provider call", () => {
	expect(() => buildPreference({ currency: "USD" })).toThrow(
		MercadoPagoPreferenceInvariantError,
	);
});

test("preference body keeps sandbox callbacks and attempt-level identity", () => {
	const preference = buildPreference();

	expect(preference.body).toMatchObject({
		external_reference: "user_transaction:123",
		back_urls: {
			success: "https://coco-murex.vercel.app/checkout/mercadopago/success",
			failure: "https://coco-murex.vercel.app/checkout/mercadopago/failure",
			pending: "https://coco-murex.vercel.app/checkout/mercadopago/pending",
		},
		notification_url:
			"https://coco-murex.vercel.app/api/mercadopago/webhook?source_news=webhooks",
		expiration_date_to: "2026-07-24T13:00:00.000Z",
	});
	expect(preference.requestOptions).toEqual({
		idempotencyKey: "mercadopago:preference:userTransaction:123",
	});
	expect(preference.externalReference).toBe("user_transaction:123");
});

test("notification URLs explicitly request webhook delivery", () => {
	expect(
		toMercadoPagoWebhookUrl(
			"https://coco-murex.vercel.app/api/mercadopago/webhook",
		),
	).toBe(
		"https://coco-murex.vercel.app/api/mercadopago/webhook?source_news=webhooks",
	);
});

test("notification URLs preserve existing query parameters", () => {
	expect(
		toMercadoPagoWebhookUrl(
			"https://example.com/webhook?tenant=coco&source_news=ipn",
		),
	).toBe("https://example.com/webhook?tenant=coco&source_news=webhooks");
});
