import { beforeAll, beforeEach, expect, test, vi } from "vitest";

// node-postgres runs one query at a time per client and deprecates queueing a
// second one while the first is in flight (removed in pg@9). Every query inside
// `db.$transaction` shares a single client, so these tests fail whenever two of
// them overlap. The data layer is stubbed; only call ordering is under test.

const tx = { name: "tx" };
let inFlight = 0;
let overlaps: string[] = [];

function tracked<T>(name: string, result: T) {
	return vi.fn(async () => {
		inFlight += 1;
		if (inFlight > 1) overlaps.push(name);
		await new Promise((resolve) => setTimeout(resolve, 0));
		inFlight -= 1;
		return result;
	});
}

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

const data = {
	findCheckoutCartByUserId: tracked("findCheckoutCartByUserId", cart),
	listCheckoutAddresses: tracked("listCheckoutAddresses", []),
	findCheckoutAddressById: tracked("findCheckoutAddressById", null),
	findCheckoutPaymentMethodById: tracked("findCheckoutPaymentMethodById", null),
	findTransactionByIdempotencyKey: vi.fn(async () => null),
};
const getMercadoPagoConfig = tracked("getMercadoPagoConfig", {
	enabled: false,
});
const getExternalPaymentConfig = tracked("getExternalPaymentConfig", {
	enabled: false,
});

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({
	db: {
		$transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
	},
}));
vi.mock("./checkout.data", () => data);
vi.mock("../payments/mercadopago/mercadopago-config.service", () => ({
	getMercadoPagoConfig,
}));
vi.mock("../payments/external/external-payment-config.service", () => ({
	EXTERNAL_PROVIDER: "external",
	getExternalPaymentConfig,
}));
vi.mock("../payments/mercadopago/mercadopago-preference.service", () => ({
	createMercadoPagoPreference: vi.fn(),
}));
vi.mock("./checkout-release", () => ({ releaseCheckoutCart: vi.fn() }));

let checkoutService: typeof import("./checkout.service");

beforeAll(async () => {
	checkoutService = await import("./checkout.service");
});

beforeEach(() => {
	inFlight = 0;
	overlaps = [];
});

test("getState reads addresses and provider configs one at a time", async () => {
	await checkoutService.getState("user-1");

	expect(data.listCheckoutAddresses).toHaveBeenCalledWith(tx, "user-1");
	expect(getMercadoPagoConfig).toHaveBeenCalledWith(tx);
	expect(getExternalPaymentConfig).toHaveBeenCalledWith(tx);
	expect(overlaps).toEqual([]);
});

test("start reads addresses and provider configs one at a time", async () => {
	await checkoutService.start("user-1");

	expect(overlaps).toEqual([]);
});

test("confirmAndPay looks up the address and payment method one at a time", async () => {
	await expect(
		checkoutService.confirmAndPay("user-1", {
			idempotencyKey: "idem-1",
			shippingAddressId: 1,
			paymentMethodId: 2,
		} as Parameters<typeof checkoutService.confirmAndPay>[1]),
	).rejects.toThrow("Seleccioná una dirección de envío válida.");

	expect(data.findCheckoutAddressById).toHaveBeenCalledWith(tx, "user-1", 1);
	expect(data.findCheckoutPaymentMethodById).toHaveBeenCalledWith(
		tx,
		"user-1",
		2,
	);
	expect(overlaps).toEqual([]);
});
