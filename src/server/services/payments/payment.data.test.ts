import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPaymentProviderEvent, getPaymentStats } from "./payment.data";

it("deduplicates deliveries by provider event id without replacing the original linkage", async () => {
	let row: Record<string, unknown> | null = null;
	const upsert = vi.fn(async ({ create, update }) => {
		if (!row) row = { id: 7, retryCount: 0, ...create };
		else
			row = {
				...row,
				...update,
				retryCount: Number(row.retryCount) + update.retryCount.increment,
			};
		return row;
	});
	const database = { paymentProviderEvent: { upsert, create: vi.fn() } };
	const input = {
		provider: "mercadopago",
		providerMode: "sandbox" as const,
		eventType: "payment",
		action: "payment.updated",
		providerEventId: "event-1",
		providerResourceType: "payment",
		providerResourceId: "123",
		providerRequestId: "request-1",
		signatureValid: true,
		status: "received" as const,
		payload: { delivery: 1 },
		headers: {},
		query: {},
		userTransactionId: 50,
	};
	const first = await createPaymentProviderEvent(database as never, input);
	const second = await createPaymentProviderEvent(database as never, {
		...input,
		providerRequestId: "request-2",
		payload: { delivery: 2 },
		userTransactionId: null,
	});
	expect(first.id).toBe(second.id);
	expect(second).toMatchObject({
		id: 7,
		retryCount: 1,
		userTransactionId: 50,
		payload: { delivery: 2 },
	});
	expect(upsert).toHaveBeenLastCalledWith(
		expect.objectContaining({
			where: {
				provider_providerEventId: {
					provider: "mercadopago",
					providerEventId: "event-1",
				},
			},
		}),
	);
	expect(database.paymentProviderEvent.create).not.toHaveBeenCalled();
});

it("records notifications without a provider event id separately", async () => {
	const create = vi
		.fn()
		.mockResolvedValueOnce({ id: 7 })
		.mockResolvedValueOnce({ id: 8 });
	const database = { paymentProviderEvent: { upsert: vi.fn(), create } };
	const input = {
		provider: "mercadopago",
		providerMode: "sandbox" as const,
		eventType: "payment",
		action: "payment.updated",
		providerEventId: null,
		providerResourceType: "payment",
		providerResourceId: "123",
		providerRequestId: null,
		signatureValid: false,
		status: "rejected" as const,
		payload: {},
		headers: {},
		query: {},
	};
	const first = await createPaymentProviderEvent(database as never, input);
	const second = await createPaymentProviderEvent(database as never, input);
	expect(first.id).not.toBe(second.id);
	expect(create).toHaveBeenCalledTimes(2);
	expect(database.paymentProviderEvent.upsert).not.toHaveBeenCalled();
});

it("includes external transfers in the global payment dashboard totals", async () => {
	const attempts = [
		{ provider: "external", status: "pending" },
		{ provider: "external", status: "completed" },
		{ provider: "external", status: "failed" },
		{ provider: "mercadopago", status: "inProcess" },
		{ provider: "mercadopago", status: "completed" },
	];
	const events = [
		{ provider: "mercadopago", status: "failed" },
		{ provider: "mercadopago", status: "rejected" },
	];
	type Filter = {
		where?: { provider?: string; status?: string | { in: string[] } };
	};
	const count = (rows: typeof attempts) =>
		vi.fn(
			async (input: Filter = {}) =>
				rows.filter((row) => {
					const where = input.where;
					if (where?.provider && row.provider !== where.provider) return false;
					if (typeof where?.status === "string")
						return row.status === where.status;
					return !where?.status || where.status.in.includes(row.status);
				}).length,
		);
	const result = await getPaymentStats({
		userTransaction: { count: count(attempts) },
		paymentProviderEvent: { count: count(events) },
	} as never);
	expect(result).toEqual({
		totalAttempts: 5,
		pendingAttempts: 2,
		completedAttempts: 2,
		failedAttempts: 1,
		receivedEvents: 2,
		failedEvents: 1,
	});
});
