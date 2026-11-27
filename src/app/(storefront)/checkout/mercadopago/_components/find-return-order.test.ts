import { beforeEach, expect, test, vi } from "vitest";

const resolvePaymentReturn = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("~/trpc/server", () => ({
	api: { orders: { resolvePaymentReturn } },
}));

const { findReturnOrderId } = await import("./find-return-order");

beforeEach(() => {
	resolvePaymentReturn.mockReset();
});

test("finds the order of one of the user's attempts", async () => {
	resolvePaymentReturn.mockResolvedValueOnce({ orderId: 222 });

	await expect(
		findReturnOrderId({ external_reference: "user_transaction:241" }),
	).resolves.toBe(222);
	expect(resolvePaymentReturn).toHaveBeenCalledWith({
		externalReference: "user_transaction:241",
	});
});

test("an attempt that is not the user's finds nothing", async () => {
	resolvePaymentReturn.mockResolvedValueOnce(null);

	await expect(
		findReturnOrderId({ external_reference: "user_transaction:9" }),
	).resolves.toBeNull();
});

test("a signed-out return finds nothing instead of failing", async () => {
	resolvePaymentReturn.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

	await expect(
		findReturnOrderId({ external_reference: "user_transaction:241" }),
	).resolves.toBeNull();
});

test("a return without a reference does not ask the server", async () => {
	await expect(findReturnOrderId({})).resolves.toBeNull();
	expect(resolvePaymentReturn).not.toHaveBeenCalled();
});
