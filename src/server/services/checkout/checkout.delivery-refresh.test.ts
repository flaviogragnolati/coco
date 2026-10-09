import { beforeAll, expect, test, vi } from "vitest";

import { Prisma } from "~/prisma/client";

// The reuse path of `confirmAndPay`: a customer who goes back and changes the
// delivery before paying must leave the live order carrying the new choice.

const tx = { name: "tx" };

const cart = {
	id: 1,
	code: "CART-1",
	status: "atCheckout",
	deleted: false,
	userId: "user-1",
	cartItems: [
		{
			id: 10,
			code: "CI-10",
			quantity: "100",
			productSnapshot: {},
			productClientTermsId: 5,
			productClientTerms: {
				id: 5,
				moq: "100",
				moqPrice: "500",
				step: null,
				stepPrice: null,
				max: null,
				unitPrice: null,
				marketPrice: null,
				discountPercent: null,
				currency: "ARS",
				fromDate: new Date("2026-01-01T00:00:00.000Z"),
				toDate: null,
				active: true,
				deleted: false,
				product: {
					id: 9,
					name: "Tomate",
					description: null,
					unit: "kg",
					brand: null,
					cardImageUrl: null,
					cartImageUrl: null,
					active: true,
					deleted: false,
				},
			},
		},
	],
};

const externalMethod = {
	id: 2,
	type: "bank_transfer",
	label: "Pago externo",
	details: "Transferencia bancaria",
	provider: "external",
	externalPaymentMethodId: "external_bank_transfer",
	active: true,
};

const centro = {
	id: 3,
	name: "Centro",
	line1: "San Martín 100",
	line2: null,
	city: "Ushuaia",
	state: "Tierra del Fuego",
	postalCode: null,
	country: "AR",
	googleMapsUrl: null,
	hours: "Lun a vie 10 a 18 h",
	instructions: null,
};

const pendingAttempt = {
	id: 50,
	amount: new Prisma.Decimal("500"),
	currency: "ARS",
	status: "pending",
	completedAt: null,
	provider: "external",
	providerMode: null,
	externalTransactionId: null,
	providerPreferenceId: null,
	providerPaymentId: null,
	providerStatus: "awaiting_transfer",
	providerStatusDetail: null,
	declaredReceiptReference: null,
	declaredReceiptAt: null,
	failureCode: null,
	failureMessage: null,
	checkoutUrl: null,
	sandboxCheckoutUrl: null,
	expiresAt: new Date(Date.now() + 60 * 60 * 1000),
	createdAt: new Date("2026-10-09T10:00:00.000Z"),
	paymentMethod: externalMethod,
};

function liveOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: 70,
		code: "ORD-70",
		userId: "user-1",
		status: "pending",
		billingAddressSnapshot: null,
		shippingAddressSnapshot: {
			source: "checkout",
			capturedAt: "2026-10-09T10:00:00.000Z",
			address: {
				id: 1,
				type: "shipping",
				line1: "Maipú 50",
				line2: null,
				city: "Ushuaia",
				state: "Tierra del Fuego",
				postalCode: "9410",
				country: "AR",
				active: true,
			},
		},
		deliveryPreference: "homeDelivery",
		pickupPointSnapshot: null,
		termsSnapshot: null,
		acceptedTermsAt: null,
		createdAt: new Date("2026-10-09T10:00:00.000Z"),
		updatedAt: new Date("2026-10-09T10:00:00.000Z"),
		cart: { code: "CART-1" },
		user: { email: "ana@example.com" },
		items: [],
		transactions: [pendingAttempt],
		...overrides,
	};
}

const data = {
	findTransactionByIdempotencyKey: vi.fn(async () => null),
	findCheckoutCartByUserId: vi.fn(async () => cart),
	findCheckoutPickupPointById: vi.fn(async () => centro),
	findCheckoutAddressById: vi.fn(async () => null),
	findCheckoutPaymentMethodById: vi.fn(async () => externalMethod),
	findLiveOrderByCartId: vi.fn(async () => liveOrder()),
	updateOrderDelivery: vi.fn(
		async (
			_db: unknown,
			_id: number,
			delivery: { deliveryPreference: string; pickupPointSnapshot: unknown },
		) =>
			liveOrder({
				deliveryPreference: delivery.deliveryPreference,
				pickupPointSnapshot: delivery.pickupPointSnapshot,
				shippingAddressSnapshot: null,
			}),
	),
	createUserOrder: vi.fn(),
	createPendingTransaction: vi.fn(),
};

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({
	db: { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) },
}));
vi.mock("./checkout.data", () => data);
vi.mock("../payments/mercadopago/mercadopago-config.service", () => ({
	getMercadoPagoConfig: vi.fn(async () => ({ enabled: false })),
}));
vi.mock("../payments/external/external-payment-config.service", () => ({
	EXTERNAL_PROVIDER: "external",
	getExternalPaymentConfig: vi.fn(async () => ({
		enabled: true,
		settings: {
			accountHolder: "Coco",
			bankName: "Banco",
			cbu: "000",
			alias: null,
			taxId: null,
			instructions: null,
			expiresInHours: 72,
		},
	})),
}));
vi.mock("../payments/mercadopago/mercadopago-preference.service", () => ({
	createMercadoPagoPreference: vi.fn(),
}));
vi.mock("./checkout-release", () => ({ releaseCheckoutCart: vi.fn() }));

let checkoutService: typeof import("./checkout.service");

beforeAll(async () => {
	checkoutService = await import("./checkout.service");
});

test("re-confirming with a pickup point refreshes the live order before answering with its attempt", async () => {
	const result = await checkoutService.confirmAndPay("user-1", {
		idempotencyKey: "00000000-0000-4000-8000-000000000001",
		acceptedTerms: true,
		paymentMethodId: 2,
		delivery: { mode: "pickupPoint", pickupPointId: 3 },
	});

	expect(data.updateOrderDelivery).toHaveBeenCalledWith(
		tx,
		70,
		expect.objectContaining({
			deliveryPreference: "pickupPoint",
			pickupPointId: 3,
			shippingAddressSnapshot: null,
		}),
	);
	expect(data.createUserOrder).not.toHaveBeenCalled();
	expect(data.createPendingTransaction).not.toHaveBeenCalled();
	expect(result).toMatchObject({
		status: "pending",
		deliveryPreference: "pickupPoint",
		shippingAddress: null,
		pickupPoint: { id: 3, name: "Centro" },
		order: { id: 70, code: "ORD-70" },
	});
});
