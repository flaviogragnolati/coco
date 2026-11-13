import { beforeAll, expect, test, vi } from "vitest";

const data = {
	cancelOtherPendingAttempts: vi.fn(async () => 1),
	updateCartStatus: vi.fn(async () => null),
	updateOrderStatus: vi.fn(async () => ({ id: 70 })),
};

vi.mock("server-only", () => ({}));
vi.mock("~/server/services/checkout/checkout.data", () => data);
vi.mock("~/server/events/domain-event-publisher", () => ({
	DomainEventPublisher: { publishMany: vi.fn(async () => undefined) },
}));

let service: typeof import("./order-submission.service");

beforeAll(async () => {
	service = await import("./order-submission.service");
});

test("a completed payment cancels the order's other pending attempts", async () => {
	const tx = {
		userOrderItem: {
			findMany: vi.fn(async () => [{ id: 100, sourceCartItemId: 10 }]),
		},
		cartItem: {
			findMany: vi.fn(async () => [{ id: 10, quantity: "1" }]),
			updateMany: vi.fn(async () => ({ count: 1 })),
		},
	};

	await service.submitOrderForCompletedPayment(tx as never, {
		orderId: 70,
		cartId: 1,
		transactionId: 90,
		actor: { source: "system", actorReference: "mercadopago:webhook" },
	});

	expect(data.cancelOtherPendingAttempts).toHaveBeenCalledWith(tx, {
		userOrderId: 70,
		keepTransactionId: 90,
	});
});
