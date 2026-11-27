import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { Prisma } from "~/prisma/client";

// What the order page reads besides the cart (ADR 0015): the order a frozen
// cart is waiting on, the order list, and where a Mercado Pago return lands.

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
			quantity: "1",
			productSnapshot: {},
			productClientTermsId: 5,
			productClientTerms: {
				id: 5,
				moq: "1",
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
					name: "Almendra",
					description: null,
					unit: "kg",
					presentationContainer: null,
					presentationSize: null,
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

const address = {
	id: 4,
	type: "shipping",
	line1: "Gobernador Paz 1240",
	line2: null,
	city: "Ushuaia",
	state: "Tierra del Fuego",
	postalCode: "9410",
	country: "Argentina",
	active: true,
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

function attempt(overrides: Record<string, unknown> = {}) {
	return {
		id: 61,
		amount: new Prisma.Decimal("450"),
		currency: "ARS",
		status: "pending",
		provider: "external",
		providerPaymentId: null,
		declaredReceiptReference: null as string | null,
		paymentMethod: externalMethod,
		...overrides,
	};
}

function liveOrder(overrides: Record<string, unknown> = {}) {
	return {
		id: 70,
		code: "ORD-70",
		deliveryPreference: "homeDelivery",
		pickupPointId: null,
		shippingAddressSnapshot: { address },
		transactions: [attempt()],
		...overrides,
	};
}

const data = {
	findCheckoutCartByUserId: vi.fn(async (): Promise<unknown> => cart),
	listCheckoutAddresses: vi.fn(async () => [address]),
	listCheckoutPickupPoints: vi.fn(async () => []),
	findMercadoPagoPaymentMethod: vi.fn(async () => null),
	findExternalPaymentMethod: vi.fn(async () => externalMethod),
	findLiveOrderByCartId: vi.fn(async (): Promise<unknown> => null),
	listOrdersByUserId: vi.fn(async (): Promise<unknown[]> => []),
	findOrderIdByTransactionId: vi.fn(async (): Promise<number | null> => null),
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
		settings: { transferDiscountPercent: 10 },
	})),
}));
vi.mock("../payments/mercadopago/mercadopago-preference.service", () => ({
	createMercadoPagoPreference: vi.fn(),
	recoverMercadoPagoPreference: vi.fn(),
}));
vi.mock("./checkout-release", () => ({ releaseCheckoutCart: vi.fn() }));

let checkoutService: typeof import("./checkout.service");

beforeAll(async () => {
	checkoutService = await import("./checkout.service");
});

beforeEach(() => {
	vi.clearAllMocks();
	data.findCheckoutCartByUserId.mockImplementation(async () => cart);
	data.findLiveOrderByCartId.mockImplementation(async () => null);
});

describe("the order a frozen cart is waiting on", () => {
	test("an editable cart has none and is not looked up", async () => {
		data.findCheckoutCartByUserId.mockResolvedValueOnce({
			...cart,
			status: "pending",
		});

		const state = await checkoutService.getState("user-1");

		expect(state.liveOrder).toBeNull();
		expect(data.findLiveOrderByCartId).not.toHaveBeenCalled();
	});

	test("a cart an older flow left at checkout with no order has none", async () => {
		const state = await checkoutService.getState("user-1");

		expect(data.findLiveOrderByCartId).toHaveBeenCalledWith(tx, cart.id);
		expect(state.liveOrder).toBeNull();
	});

	test("an unpaid transfer carries its choices and can be released", async () => {
		data.findLiveOrderByCartId.mockResolvedValueOnce(liveOrder());

		const state = await checkoutService.getState("user-1");

		expect(state.liveOrder).toEqual({
			id: 70,
			code: "ORD-70",
			delivery: { mode: "homeDelivery", shippingAddressId: address.id },
			paymentMethodId: externalMethod.id,
			provider: "external",
			release: "release",
		});
	});

	test("a pickup point order carries the point it was confirmed with", async () => {
		data.findLiveOrderByCartId.mockResolvedValueOnce(
			liveOrder({
				deliveryPreference: "pickupPoint",
				pickupPointId: 3,
				shippingAddressSnapshot: null,
			}),
		);

		const state = await checkoutService.getState("user-1");

		expect(state.liveOrder?.delivery).toEqual({
			mode: "pickupPoint",
			pickupPointId: 3,
		});
	});

	test("an order paid before the customer could choose has no delivery", async () => {
		data.findLiveOrderByCartId.mockResolvedValueOnce(
			liveOrder({ deliveryPreference: null, shippingAddressSnapshot: null }),
		);

		const state = await checkoutService.getState("user-1");

		expect(state.liveOrder?.delivery).toBeNull();
	});

	test("a declared transfer blocks editing", async () => {
		data.findLiveOrderByCartId.mockResolvedValueOnce(
			liveOrder({
				transactions: [attempt({ declaredReceiptReference: "0012345678" })],
			}),
		);

		const state = await checkoutService.getState("user-1");

		expect(state.liveOrder?.release).toBe("blockedDeclaredReceipt");
	});

	test("a payment the provider is holding blocks editing", async () => {
		data.findLiveOrderByCartId.mockResolvedValueOnce(
			liveOrder({
				transactions: [
					attempt({ provider: "mercadopago", providerPaymentId: "191" }),
				],
			}),
		);

		const state = await checkoutService.getState("user-1");

		expect(state.liveOrder?.release).toBe("blockedPaymentInFlight");
	});

	test("an order without attempts has no payment choice yet", async () => {
		data.findLiveOrderByCartId.mockResolvedValueOnce(
			liveOrder({ transactions: [] }),
		);

		const state = await checkoutService.getState("user-1");

		expect(state.liveOrder).toMatchObject({
			paymentMethodId: null,
			provider: null,
			release: "release",
		});
	});
});

describe("the order list", () => {
	function listed(overrides: Record<string, unknown> = {}) {
		return {
			id: 70,
			code: "ORD-70",
			status: "pending",
			createdAt: new Date("2026-11-27T10:00:00.000Z"),
			updatedAt: new Date("2026-11-27T10:00:00.000Z"),
			_count: { items: 3 },
			items: [
				{ productSnapshot: { product: { name: "Almendra" } } },
				{ productSnapshot: { product: { name: "Nuez mariposa" } } },
				{ productSnapshot: {} },
			],
			transactions: [
				{
					id: 61,
					amount: new Prisma.Decimal("450"),
					currency: "ARS",
					status: "pending",
					declaredReceiptReference: null,
				},
			],
			...overrides,
		};
	}

	test("names every product in the order it was confirmed", async () => {
		data.listOrdersByUserId.mockResolvedValueOnce([listed()]);

		const [order] = await checkoutService.listMine("user-1");

		expect(order?.itemNames).toEqual(["Almendra", "Nuez mariposa", "-"]);
		expect(order?.receiptDeclared).toBe(false);
	});

	test("flags a transfer the customer reported and nobody verified", async () => {
		data.listOrdersByUserId.mockResolvedValueOnce([
			listed({
				transactions: [
					{
						id: 61,
						amount: new Prisma.Decimal("450"),
						currency: "ARS",
						status: "pending",
						declaredReceiptReference: "0012345678",
					},
				],
			}),
		]);

		const [order] = await checkoutService.listMine("user-1");

		expect(order?.receiptDeclared).toBe(true);
	});

	test("a rejected transfer is no longer a declared receipt", async () => {
		data.listOrdersByUserId.mockResolvedValueOnce([
			listed({
				status: "failed",
				transactions: [
					{
						id: 61,
						amount: new Prisma.Decimal("450"),
						currency: "ARS",
						status: "failed",
						declaredReceiptReference: "0012345678",
					},
				],
			}),
		]);

		const [order] = await checkoutService.listMine("user-1");

		expect(order?.receiptDeclared).toBe(false);
	});
});

describe("a Mercado Pago return", () => {
	test("lands on the order of one of the user's attempts", async () => {
		data.findOrderIdByTransactionId.mockResolvedValueOnce(70);

		const result = await checkoutService.resolvePaymentReturn("user-1", {
			externalReference: "user_transaction:61",
		});

		expect(data.findOrderIdByTransactionId).toHaveBeenCalledWith(
			expect.anything(),
			"user-1",
			61,
		);
		expect(result).toEqual({ orderId: 70 });
	});

	test("answers nothing for an attempt that is not the user's", async () => {
		const result = await checkoutService.resolvePaymentReturn("user-1", {
			externalReference: "user_transaction:62",
		});

		expect(result).toBeNull();
	});

	test.each([
		"",
		"62",
		"user_transaction:",
		"user_transaction:0",
		"user_transaction:62 ",
		"user_transaction:99999999999",
		"order:62",
	])("ignores the reference %j without querying", async (externalReference) => {
		const result = await checkoutService.resolvePaymentReturn("user-1", {
			externalReference,
		});

		expect(result).toBeNull();
		expect(data.findOrderIdByTransactionId).not.toHaveBeenCalled();
	});
});
