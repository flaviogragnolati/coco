import { beforeAll, expect, test, vi } from "vitest";

const data = {
	cancelOtherPendingAttempts: vi.fn(async () => [61]),
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

	const result = await service.submitOrderForCompletedPayment(tx as never, {
		orderId: 70,
		cartId: 1,
		transactionId: 90,
		actor: { source: "system", actorReference: "mercadopago:webhook" },
	});

	expect(data.cancelOtherPendingAttempts).toHaveBeenCalledWith(tx, {
		userOrderId: 70,
		keepTransactionId: 90,
	});
	expect(result.cancelledAttemptIds).toEqual([61]);
});

test("a sequential late approval cannot publish another submission for items already submitted", async () => {
	const { DomainEventPublisher } = await import(
		"~/server/events/domain-event-publisher"
	);
	vi.mocked(DomainEventPublisher.publishMany).mockClear();
	let submitted = false;
	const tx = {
		userOrderItem: {
			findMany: vi.fn(async () => [{ id: 100, sourceCartItemId: 10 }]),
		},
		cartItem: {
			findMany: vi.fn(async () =>
				submitted ? [] : [{ id: 10, quantity: "1" }],
			),
			updateMany: vi.fn(async () => {
				submitted = true;
				return { count: 1 };
			}),
		},
	};
	for (const transactionId of [90, 61]) {
		await service.submitOrderForCompletedPayment(tx as never, {
			orderId: 70,
			cartId: 1,
			transactionId,
			actor: { source: "system", actorReference: "mercadopago" },
		});
	}
	const facts = vi
		.mocked(DomainEventPublisher.publishMany)
		.mock.calls.flatMap((call) => call[1]);
	expect(facts).toHaveLength(1);
	expect(facts[0]).toMatchObject({
		type: "cart.item.submittedToOrder",
		payload: { cartItemId: "10", transactionId: "90" },
	});
});
