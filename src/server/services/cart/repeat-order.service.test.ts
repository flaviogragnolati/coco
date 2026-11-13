import { beforeAll, beforeEach, expect, test, vi } from "vitest";

// Repeating an order only reads it and adds to the current cart. It must never
// release a checkout that has an order waiting for its payment.

const tx = { name: "tx" };

function termsRecord(
	productId: number,
	overrides: Record<string, unknown> = {},
) {
	return {
		id: productId * 10,
		moq: "0.5",
		moqPrice: "11300",
		step: "0.5",
		stepPrice: null,
		max: "5",
		unitPrice: "22600",
		marketPrice: null,
		discountPercent: null,
		currency: "ARS",
		active: true,
		deleted: false,
		fromDate: new Date("2026-01-01T00:00:00.000Z"),
		toDate: null,
		product: {
			id: productId,
			name: `Producto ${productId}`,
			description: null,
			unit: "kg",
			presentationContainer: null,
			presentationSize: null,
			cardImageUrl: null,
			cartImageUrl: null,
			active: true,
			deleted: false,
			brand: null,
		},
		...overrides,
	};
}

function orderItem(productId: number, quantity: string) {
	return {
		id: productId,
		sourceCartItemId: productId,
		quantity,
		productSnapshot: {
			product: { id: productId, name: `Viejo ${productId}`, unit: "kg" },
		},
		priceSnapshot: {},
		createdAt: new Date("2026-10-01T00:00:00.000Z"),
	};
}

function order(overrides: Record<string, unknown> = {}) {
	return {
		id: 7,
		code: "ORD-7",
		userId: "user-1",
		status: "completed",
		items: [orderItem(1, "1"), orderItem(2, "0.5")],
		transactions: [],
		...overrides,
	};
}

const waitingOrder = order({
	id: 70,
	code: "ORD-70",
	status: "pending",
	transactions: [{ id: 50, amount: "34900.00", currency: "ARS" }],
});

const pendingCart = {
	id: 3,
	code: "CART-3",
	status: "pending",
	deleted: false,
};
const checkoutCart = { ...pendingCart, status: "atCheckout" };

const cartData = {
	findCurrentCartForMutationByUserId: vi.fn(),
	createCurrentCart: vi.fn(),
	listCurrentClientTermsByProductIds: vi.fn(),
	listActiveCartItemsByTerms: vi.fn(),
	createCartItem: vi.fn(),
	updateCartItemQuantity: vi.fn(),
	findCartById: vi.fn(),
	findActiveCartItemByTerms: vi.fn(),
	findCurrentCartByUserId: vi.fn(),
	findProductClientTermsForCart: vi.fn(),
	listProductClientTermsForCart: vi.fn(),
	softDeleteCartItem: vi.fn(),
	softDeleteCartItemsByCartId: vi.fn(),
};

const checkoutData = {
	findOrderByUserId: vi.fn(),
	findLiveOrderByCartId: vi.fn(),
	cancelTransaction: vi.fn(),
	updateOrderStatus: vi.fn(),
	updateCartStatus: vi.fn(),
};

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({
	db: { $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) },
}));
vi.mock("./cart.data", () => cartData);
vi.mock("../checkout/checkout.data", () => checkoutData);
vi.mock("../checkout/checkout-release", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../checkout/checkout-release")>();
	return { releaseCheckoutCart: vi.fn(actual.releaseCheckoutCart) };
});

let service: typeof import("./repeat-order.service");
let release: typeof import("../checkout/checkout-release");

beforeAll(async () => {
	service = await import("./repeat-order.service");
	release = await import("../checkout/checkout-release");
});

beforeEach(() => {
	vi.clearAllMocks();
	cartData.findCurrentCartForMutationByUserId.mockResolvedValue(pendingCart);
	cartData.listCurrentClientTermsByProductIds.mockResolvedValue([
		termsRecord(1),
		termsRecord(2),
	]);
	cartData.listActiveCartItemsByTerms.mockResolvedValue([]);
	cartData.findCartById.mockResolvedValue({ ...pendingCart, cartItems: [] });
	checkoutData.findOrderByUserId.mockResolvedValue(order());
	checkoutData.findLiveOrderByCartId.mockResolvedValue(null);
	checkoutData.updateCartStatus.mockResolvedValue({
		...pendingCart,
		cartItems: [],
	});
});

function expectNoCartWrites() {
	expect(cartData.createCurrentCart).not.toHaveBeenCalled();
	expect(cartData.createCartItem).not.toHaveBeenCalled();
	expect(cartData.updateCartItemQuantity).not.toHaveBeenCalled();
	expect(checkoutData.updateCartStatus).not.toHaveBeenCalled();
}

test("another customer's order is not found", async () => {
	checkoutData.findOrderByUserId.mockResolvedValue(null);

	await expect(service.previewRepeat("user-1", 7)).rejects.toMatchObject({
		code: "NOT_FOUND",
	});
	await expect(
		service.repeat("user-1", { orderId: 7, productIds: [1] }),
	).rejects.toMatchObject({ code: "NOT_FOUND" });
	expect(checkoutData.findOrderByUserId).toHaveBeenCalledWith(
		expect.anything(),
		"user-1",
		7,
	);
	expectNoCartWrites();
});

test("a pending order is refused without writing", async () => {
	checkoutData.findOrderByUserId.mockResolvedValue(
		order({ status: "pending" }),
	);

	await expect(service.previewRepeat("user-1", 7)).rejects.toMatchObject({
		code: "PRECONDITION_FAILED",
		message: service.REPEAT_ORDER_PENDING_MESSAGE,
	});
	await expect(
		service.repeat("user-1", { orderId: 7, productIds: [1] }),
	).rejects.toMatchObject({
		code: "PRECONDITION_FAILED",
		message: service.REPEAT_ORDER_PENDING_MESSAGE,
	});
	expectNoCartWrites();
});

test("with an order waiting for its payment the preview shows it", async () => {
	cartData.findCurrentCartForMutationByUserId.mockResolvedValue(checkoutCart);
	checkoutData.findLiveOrderByCartId.mockResolvedValue(waitingOrder);

	await expect(service.previewRepeat("user-1", 7)).resolves.toEqual({
		state: "blocked",
		waitingOrder: {
			id: 70,
			code: "ORD-70",
			totalAmount: "34900.00",
			currency: "ARS",
		},
	});
});

test("with an order waiting for its payment repeating is refused and nothing is cancelled", async () => {
	cartData.findCurrentCartForMutationByUserId.mockResolvedValue(checkoutCart);
	checkoutData.findLiveOrderByCartId.mockResolvedValue(waitingOrder);

	await expect(
		service.repeat("user-1", { orderId: 7, productIds: [1, 2] }),
	).rejects.toMatchObject({
		code: "PRECONDITION_FAILED",
		message: service.REPEAT_BLOCKED_MESSAGE,
	});
	expect(release.releaseCheckoutCart).not.toHaveBeenCalled();
	expect(checkoutData.cancelTransaction).not.toHaveBeenCalled();
	expect(checkoutData.updateOrderStatus).not.toHaveBeenCalled();
	expectNoCartWrites();
});

test("a checkout without a live order is released and the products are added", async () => {
	cartData.findCurrentCartForMutationByUserId.mockResolvedValue(checkoutCart);

	const output = await service.repeat("user-1", {
		orderId: 7,
		productIds: [1, 2],
	});

	expect(release.releaseCheckoutCart).toHaveBeenCalledTimes(1);
	expect(checkoutData.updateCartStatus).toHaveBeenCalledWith(tx, 3, "pending");
	expect(cartData.createCartItem).toHaveBeenCalledTimes(2);
	expect(output.lines.map((line) => line.outcome)).toEqual(["added", "added"]);
});

test("only the chosen products are added", async () => {
	const output = await service.repeat("user-1", {
		orderId: 7,
		productIds: [2],
	});

	expect(cartData.createCartItem).toHaveBeenCalledTimes(1);
	expect(cartData.createCartItem).toHaveBeenCalledWith(
		tx,
		expect.objectContaining({ productClientTermsId: 20, quantity: "0.5" }),
	);
	expect(output.lines).toEqual([
		{ productId: 2, name: "Producto 2", outcome: "added", quantity: "0.5" },
	]);
});

test("choosing nothing from the order is refused", async () => {
	await expect(
		service.repeat("user-1", { orderId: 7, productIds: [99] }),
	).rejects.toMatchObject({ code: "BAD_REQUEST" });
	expectNoCartWrites();
});

test("a product without current terms is unavailable and not written", async () => {
	cartData.listCurrentClientTermsByProductIds.mockResolvedValue([
		termsRecord(1),
	]);

	const preview = await service.previewRepeat("user-1", 7);
	expect(preview).toMatchObject({
		state: "ready",
		lines: [
			{ productId: 1, available: true, quantityLabel: "1 kg" },
			{
				productId: 2,
				name: "Viejo 2",
				available: false,
				quantity: "0.5",
				lineTotal: null,
			},
		],
	});

	const output = await service.repeat("user-1", {
		orderId: 7,
		productIds: [1, 2],
	});
	expect(cartData.createCartItem).toHaveBeenCalledTimes(1);
	expect(output.lines).toEqual([
		{ productId: 1, name: "Producto 1", outcome: "added", quantity: "1" },
		{ productId: 2, name: "Viejo 2", outcome: "unavailable", quantity: null },
	]);
});

test("a product already in the cart grows by the order's quantity, fitted to the terms", async () => {
	checkoutData.findOrderByUserId.mockResolvedValue(
		order({ items: [orderItem(1, "0.7")] }),
	);
	cartData.listActiveCartItemsByTerms.mockResolvedValue([
		{ id: 400, productClientTermsId: 10, quantity: "1" },
	]);

	const output = await service.repeat("user-1", {
		orderId: 7,
		productIds: [1],
	});

	expect(cartData.updateCartItemQuantity).toHaveBeenCalledWith(tx, 400, "2");
	expect(cartData.createCartItem).not.toHaveBeenCalled();
	expect(output.lines).toEqual([
		{ productId: 1, name: "Producto 1", outcome: "adjusted", quantity: "2" },
	]);
});

test("a product sold under new terms is added with the current ones", async () => {
	cartData.listCurrentClientTermsByProductIds.mockResolvedValue([
		termsRecord(1, { id: 777, unitPrice: "25000" }),
		termsRecord(1, { id: 10 }),
	]);
	checkoutData.findOrderByUserId.mockResolvedValue(
		order({ items: [orderItem(1, "1")] }),
	);

	const preview = await service.previewRepeat("user-1", 7);
	expect(preview).toMatchObject({
		state: "ready",
		lines: [{ productId: 1, lineTotal: "25000.00", currency: "ARS" }],
	});

	await service.repeat("user-1", { orderId: 7, productIds: [1] });
	expect(cartData.createCartItem).toHaveBeenCalledWith(
		tx,
		expect.objectContaining({ productClientTermsId: 777, quantity: "1" }),
	);
});
