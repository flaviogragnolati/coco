import { beforeAll, beforeEach, expect, test, vi } from "vitest";

import { Prisma } from "~/prisma/client";
import { buildMercadoPagoPreferenceCreateData } from "../payments/mercadopago/mercadopago-preference.decision";

// `confirmAndPay` when the amount depends on the payment method (ADR 0013):
// idempotency, one live order per cart and the Mercado Pago preference
// invariant must hold while a transfer carries the discount.

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

const mercadoPagoMethod = {
	id: 1,
	type: "mercadopago",
	label: "Mercado Pago",
	details: "Mercado Pago",
	provider: "mercadopago",
	externalPaymentMethodId: null,
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

const mercadoPagoSettings = {
	publicBaseUrl: "https://coco.test",
	notificationUrl: "https://coco.test/api/webhooks/mercadopago",
	successBackUrl: "https://coco.test/checkout/result",
	failureBackUrl: "https://coco.test/checkout/result",
	pendingBackUrl: "https://coco.test/checkout/result",
	preferenceExpiresInMinutes: 60,
	autoReturnApproved: true,
	binaryMode: false,
	excludedPaymentTypes: [],
	excludedPaymentMethods: [],
	statementDescriptor: null,
	allowUnsignedWebhooksInDevelopment: false,
};

const externalSettings = {
	accountHolder: "Coco",
	bankName: "Banco",
	cbu: "000",
	alias: null,
	taxId: null,
	instructions: null,
	expiresInHours: 72,
	transferDiscountPercent: 10,
};

type Attempt = ReturnType<typeof attempt>;

function attempt(overrides: Record<string, unknown> = {}) {
	return {
		id: 50,
		amount: new Prisma.Decimal("500"),
		subtotalAmount: null as Prisma.Decimal | null,
		transferDiscountPercent: null as Prisma.Decimal | null,
		transferDiscountAmount: null as Prisma.Decimal | null,
		currency: "ARS",
		status: "pending",
		completedAt: null,
		provider: "mercadopago",
		providerMode: "sandbox",
		externalTransactionId: null,
		providerPreferenceId: "pref-1",
		providerPaymentId: null,
		providerStatus: null,
		providerStatusDetail: null,
		declaredReceiptReference: null as string | null,
		declaredReceiptAt: null,
		failureCode: null,
		failureMessage: null,
		checkoutUrl: "https://mp.test/checkout",
		sandboxCheckoutUrl: null,
		expiresAt: new Date(Date.now() + 60 * 60 * 1000),
		createdAt: new Date("2026-11-13T10:00:00.000Z"),
		paymentMethod: mercadoPagoMethod,
		...overrides,
	};
}

function order(id: number, transactions: Attempt[]) {
	return {
		id,
		code: `ORD-${id}`,
		userId: "user-1",
		status: "pending",
		billingAddressSnapshot: null,
		shippingAddressSnapshot: null,
		deliveryPreference: "pickupPoint",
		pickupPointSnapshot: null,
		termsSnapshot: null,
		acceptedTermsAt: null,
		createdAt: new Date("2026-11-13T10:00:00.000Z"),
		updatedAt: new Date("2026-11-13T10:00:00.000Z"),
		cart: { code: "CART-1" },
		user: { email: "ana@example.com" },
		items: [],
		transactions,
	};
}

let liveOrder: ReturnType<typeof order> | null = null;
let created: Attempt | null = null;

const data = {
	findTransactionByIdempotencyKey: vi.fn(async (): Promise<unknown> => null),
	findCheckoutCartByUserId: vi.fn(async () => cart),
	findCheckoutPickupPointById: vi.fn(async () => centro),
	findCheckoutAddressById: vi.fn(async () => null),
	findCheckoutPaymentMethodById: vi.fn(
		async (_db: unknown, _userId: string, id: number) =>
			id === mercadoPagoMethod.id ? mercadoPagoMethod : externalMethod,
	),
	findLiveOrderByCartId: vi.fn(async () => liveOrder),
	updateOrderDelivery: vi.fn(async () => liveOrder),
	createUserOrder: vi.fn(async () => order(80, [])),
	cancelTransaction: vi.fn(async () => null),
	createPendingTransaction: vi.fn(
		async (
			_db: unknown,
			input: {
				amount: string;
				provider: string;
				transferDiscount?: {
					percent: number;
					subtotal: string;
					discount: string;
				} | null;
			},
		) => {
			const discount = input.transferDiscount ?? null;
			created = attempt({
				id: 90,
				amount: new Prisma.Decimal(input.amount),
				provider: input.provider,
				providerPreferenceId: null,
				checkoutUrl: null,
				paymentMethod:
					input.provider === "external" ? externalMethod : mercadoPagoMethod,
				subtotalAmount: discount ? new Prisma.Decimal(discount.subtotal) : null,
				transferDiscountPercent: discount
					? new Prisma.Decimal(discount.percent)
					: null,
				transferDiscountAmount: discount
					? new Prisma.Decimal(discount.discount)
					: null,
			});
			return created;
		},
	),
	markTransactionAsExternalPending: vi.fn(async () => created),
	updateTransactionWithMercadoPagoPreference: vi.fn(async () => created),
};

const createMercadoPagoPreference = vi.fn(async () => ({
	providerPreferenceId: "pref-90",
	checkoutUrl: "https://mp.test/checkout/90",
	sandboxCheckoutUrl: null,
	expiresAt: new Date(Date.now() + 60 * 60 * 1000),
	externalReference: "user_transaction:90",
	responseSnapshot: {},
}));

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({
	db: { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) },
}));
vi.mock("./checkout.data", () => data);
vi.mock("../payments/mercadopago/mercadopago-config.service", () => ({
	getMercadoPagoConfig: vi.fn(async () => ({
		enabled: true,
		mode: "sandbox",
		settings: mercadoPagoSettings,
	})),
}));
vi.mock("../payments/external/external-payment-config.service", () => ({
	EXTERNAL_PROVIDER: "external",
	getExternalPaymentConfig: vi.fn(async () => ({
		enabled: true,
		settings: externalSettings,
	})),
}));
vi.mock("../payments/mercadopago/mercadopago-preference.service", () => ({
	createMercadoPagoPreference,
}));
vi.mock("./checkout-release", () => ({ releaseCheckoutCart: vi.fn() }));
// The real preference lines are built below; the SDK client never is.
vi.mock("~/lib/mercadopago/client", () => ({
	createMercadoPagoClient: () => {
		throw new Error("not used by buildPreferenceLines");
	},
}));

let checkoutService: typeof import("./checkout.service");

beforeAll(async () => {
	checkoutService = await import("./checkout.service");
});

beforeEach(() => {
	vi.clearAllMocks();
	liveOrder = null;
	created = null;
	data.findTransactionByIdempotencyKey.mockImplementation(async () => null);
});

function confirm(paymentMethodId: number, expectedAmount: string) {
	return checkoutService.confirmAndPay("user-1", {
		idempotencyKey: "00000000-0000-4000-8000-000000000001",
		acceptedTerms: true,
		paymentMethodId,
		delivery: { mode: "pickupPoint", pickupPointId: 3 },
		expectedAmount,
	});
}

function expectNothingCreated() {
	expect(data.createUserOrder).not.toHaveBeenCalled();
	expect(data.createPendingTransaction).not.toHaveBeenCalled();
	expect(data.cancelTransaction).not.toHaveBeenCalled();
}

test("a repeated idempotency key answers with its attempt whatever amount the screen sends", async () => {
	const existing = attempt({ id: 61 });
	data.findTransactionByIdempotencyKey.mockImplementation(async () => ({
		...existing,
		userOrder: order(70, [existing]),
	}));

	const result = await confirm(mercadoPagoMethod.id, "1.00");

	expect(result.transaction).toMatchObject({ id: 61, amount: "500" });
	expectNothingCreated();
});

test("switching to transfer replaces the Mercado Pago attempt on the same live order", async () => {
	liveOrder = order(70, [attempt({ id: 61 })]);

	const result = await confirm(externalMethod.id, "450.00");

	expect(data.cancelTransaction).toHaveBeenCalledWith(tx, 61);
	expect(data.createUserOrder).not.toHaveBeenCalled();
	expect(data.createPendingTransaction).toHaveBeenCalledWith(
		tx,
		expect.objectContaining({ userOrderId: 70, provider: "external" }),
	);
	expect(result.order.id).toBe(70);
	expect(result.transaction.id).toBe(90);
});

test("Mercado Pago charges the sum of the lines and its preference builds, with a transfer percent configured", async () => {
	const result = await confirm(mercadoPagoMethod.id, "500.00");

	expect(data.createPendingTransaction).toHaveBeenCalledWith(
		tx,
		expect.objectContaining({
			amount: "500.00",
			provider: "mercadopago",
			transferDiscount: null,
		}),
	);
	expect(createMercadoPagoPreference).toHaveBeenCalledWith(
		expect.objectContaining({ transaction: created }),
	);
	expect(result.transaction).toMatchObject({
		amount: "500",
		subtotalAmount: null,
		transferDiscountPercent: null,
		transferDiscountAmount: null,
	});

	const { buildPreferenceLines } = await vi.importActual<
		typeof import("../payments/mercadopago/mercadopago-preference.service")
	>("../payments/mercadopago/mercadopago-preference.service");
	expect(() =>
		buildMercadoPagoPreferenceCreateData({
			lines: buildPreferenceLines(cart as never),
			expectedAmount: String(created?.amount),
			currency: "ARS",
			payerEmail: "ana@example.com",
			transactionId: 90,
			orderId: 80,
			orderCode: "ORD-80",
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
			settings: mercadoPagoSettings,
		}),
	).not.toThrow();
});

test("a transfer charges the discounted total and hands out that amount", async () => {
	const result = await confirm(externalMethod.id, "450.00");

	expect(data.createPendingTransaction).toHaveBeenCalledWith(
		tx,
		expect.objectContaining({
			amount: "450.00",
			transferDiscount: {
				percent: 10,
				subtotal: "500.00",
				discount: "50.00",
				total: "450.00",
			},
		}),
	);
	expect(data.markTransactionAsExternalPending).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({
			id: 90,
			requestSnapshot: expect.objectContaining({
				amount: "450",
				subtotal: "500.00",
			}),
		}),
	);
	expect(result.externalPayment?.amount).toBe("450");
	expect(result.transaction).toMatchObject({
		amount: "450",
		subtotalAmount: "500",
		transferDiscountPercent: "10",
		transferDiscountAmount: "50",
	});
});

test("an amount other than the one the server computes stops before creating anything", async () => {
	liveOrder = order(70, [attempt({ id: 61 })]);

	await expect(confirm(externalMethod.id, "500.00")).rejects.toMatchObject({
		code: "CONFLICT",
		message: expect.stringMatching(/ahora pagás \$\s?450\./),
	});
	expect(data.createUserOrder).not.toHaveBeenCalled();
	expect(data.createPendingTransaction).not.toHaveBeenCalled();
});

test("the same method answers with its open attempt even when the amount moved", async () => {
	liveOrder = order(70, [
		attempt({
			id: 62,
			provider: "external",
			providerMode: null,
			amount: new Prisma.Decimal("475"),
			paymentMethod: externalMethod,
		}),
	]);

	const result = await confirm(externalMethod.id, "450.00");

	expect(result.transaction).toMatchObject({ id: 62, amount: "475" });
	expectNothingCreated();
});

test("an attempt the customer can no longer abandon is kept whatever method they pick", async () => {
	liveOrder = order(70, [attempt({ id: 63, status: "inProcess" })]);
	const inProcess = await confirm(externalMethod.id, "450.00");
	expect(inProcess.transaction.id).toBe(63);

	liveOrder = order(70, [
		attempt({
			id: 64,
			provider: "external",
			providerMode: null,
			declaredReceiptReference: "TRX-1",
			paymentMethod: externalMethod,
		}),
	]);
	const declared = await confirm(mercadoPagoMethod.id, "500.00");
	expect(declared.transaction.id).toBe(64);

	expectNothingCreated();
});
