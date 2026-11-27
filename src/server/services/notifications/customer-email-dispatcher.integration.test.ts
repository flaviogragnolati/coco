import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { PrismaClient } from "~/prisma/client";
import { enqueueCustomerEmail } from "./customer-email.data";
import * as templates from "./customer-email.templates";
import { dispatchCustomerEmails } from "./customer-email-dispatcher";
import * as gmail from "./gmail-email.service";

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({
	get db() {
		return database;
	},
}));

const url = process.env.EMAIL_DISPATCH_TEST_DATABASE_URL;
if (url) {
	const target = new URL(url);
	if (
		!["127.0.0.1", "localhost"].includes(target.hostname) ||
		!target.pathname.endsWith("_test") ||
		target.search
	) {
		throw new Error(
			"EMAIL_DISPATCH_TEST_DATABASE_URL must identify a disposable local *_test database.",
		);
	}
}
let database: PrismaClient;
const fixture = randomUUID();
let orderId: number;
let attemptId: number;
const fetchMock = vi.fn<typeof fetch>();

describe.skipIf(!url)("customer email dispatch on PostgreSQL", () => {
	beforeAll(async () => {
		database = new PrismaClient({
			adapter: new PrismaPg({ connectionString: url }),
		});
		await database.user.create({
			data: { id: fixture, name: "Cliente", email: `${fixture}@example.org` },
		});
		const cart = await database.cart.create({
			data: { userId: fixture, code: fixture },
		});
		const order = await database.userOrder.create({
			data: { cartId: cart.id, userId: fixture, code: fixture },
		});
		orderId = order.id;
		const method = await database.paymentMethod.create({
			data: {
				userId: fixture,
				type: "other",
				label: "Transferencia",
				details: "QA",
				provider: "external",
			},
		});
		const attempt = await database.userTransaction.create({
			data: {
				amount: 100,
				currency: "ARS",
				provider: "external",
				expiresAt: new Date(Date.now() + 86_400_000),
				userOrderId: orderId,
				paymentMethodId: method.id,
				idempotencyKey: fixture,
			},
		});
		attemptId = attempt.id;
	});

	beforeEach(() => {
		vi.stubEnv("CUSTOMER_EMAIL_MODE", "test");
		vi.stubEnv("CUSTOMER_EMAIL_DISPATCH", "true");
		vi.stubEnv("CUSTOMER_EMAIL_ENVIRONMENT", fixture);
		vi.stubEnv("CUSTOMER_EMAIL_TEST_TO", "delivered@resend.dev");
		vi.stubEnv("RESEND_FROM", "pedidos@example.org");
		vi.stubEnv("RESEND_API_KEY", "re_test_dummy");
		vi.stubEnv("BETTER_AUTH_URL", "https://example.org");
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock);
	});
	afterEach(async () => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		await database.userTransaction.update({
			where: { id: attemptId },
			data: { declaredReceiptAt: null },
		});
		await database.customerEmailDelivery.deleteMany({ where: { orderId } });
	});
	afterAll(async () => {
		if (!database) return;
		await database.userTransaction.deleteMany({
			where: { userOrderId: orderId },
		});
		await database.userOrder.deleteMany({ where: { userId: fixture } });
		await database.cart.deleteMany({ where: { userId: fixture } });
		await database.paymentMethod.deleteMany({ where: { userId: fixture } });
		await database.user.deleteMany({ where: { id: fixture } });
		await database.$disconnect();
	});

	function enqueue() {
		return database.$transaction((tx) =>
			enqueueCustomerEmail(tx, orderId, `transfer/${attemptId}`, {
				kind: "transfer",
				attemptId,
			}),
		);
	}

	it("rolls back an intent and deduplicates concurrent producers and consumers across partitions", async () => {
		await expect(
			database.$transaction(async (tx) => {
				await enqueueCustomerEmail(tx, orderId, "rolled-back", {
					kind: "transfer",
					attemptId,
				});
				throw new Error("rollback");
			}),
		).rejects.toThrow("rollback");
		expect(
			await database.customerEmailDelivery.count({ where: { orderId } }),
		).toBe(0);
		await Promise.all([enqueue(), enqueue()]);
		await database.customerEmailDelivery.create({
			data: {
				orderId,
				environment: `live/${fixture}`,
				eventKey: "live",
				notice: { version: 1, kind: "transfer", attemptId },
			},
		});
		fetchMock.mockResolvedValueOnce(Response.json({ id: "email-1" }));
		await Promise.all([dispatchCustomerEmails(), dispatchCustomerEmails()]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const rows = await database.customerEmailDelivery.findMany({
			where: { orderId },
			orderBy: { environment: "desc" },
		});
		expect(rows).toMatchObject([
			{ status: "accepted", attempts: 1, providerId: "email-1" },
			{ status: "pending", attempts: 0 },
		]);
		const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
		expect(payload.to).toContain("delivered@resend.dev");
		expect(payload.subject).toContain(fixture);
	});

	it("replays exactly the frozen body and key when an expired lease follows an ambiguous send", async () => {
		await enqueue();
		const buildCurrent = templates.buildEmailRequest;
		const oldHtml =
			"<html><body><p>CoCo</p><p>Tu transferencia</p></body></html>";
		vi.spyOn(templates, "buildEmailRequest").mockImplementationOnce(
			async (...args) => {
				const email = await buildCurrent(...args);
				return email && { ...email, html: oldHtml };
			},
		);
		fetchMock.mockRejectedValueOnce(
			new Error("connection lost after acceptance"),
		);
		await dispatchCustomerEmails();
		const row = await database.customerEmailDelivery.findFirstOrThrow({
			where: { orderId },
		});
		expect(row).toMatchObject({
			status: "pending",
			attempts: 1,
			lastError: "resend_unknown_result",
		});
		await database.customerEmailDelivery.update({
			where: { id: row.id },
			data: {
				status: "processing",
				leaseToken: "old-owner",
				leaseUntil: new Date(0),
			},
		});
		vi.stubEnv("RESEND_FROM", "changed@example.org");
		fetchMock.mockResolvedValueOnce(
			Response.json({ id: "previously-accepted" }),
		);
		await dispatchCustomerEmails();
		const requests = fetchMock.mock.calls.map(([, init]) => ({
			body: init?.body,
			key: new Headers(init?.headers).get("idempotency-key"),
		}));
		expect(requests).toHaveLength(2);
		expect(requests[1]).toEqual(requests[0]);
		expect(JSON.parse(String(requests[1]?.body)).html).toBe(oldHtml);
		expect(requests[0]?.key).toBe(`coco/email/${row.id}`);
		expect(
			await database.customerEmailDelivery.findUnique({
				where: { id: row.id },
			}),
		).toMatchObject({
			status: "accepted",
			providerId: "previously-accepted",
			attempts: 2,
			leaseToken: null,
		});
	});

	it.each([
		"expired lease",
		"provider switch",
		"temporary rejection",
	] as const)("recovers Gmail after %s", async (scenario) => {
		vi.stubEnv("CUSTOMER_EMAIL_PROVIDER", "gmail");
		vi.stubEnv("GMAIL_USER", "coco@example.org");
		vi.stubEnv("GMAIL_APP_PASSWORD", "aaaa bbbb cccc dddd");
		const send = vi
			.spyOn(gmail, "sendGmail")
			.mockResolvedValueOnce({
				status: "retry",
				reason: "gmail_temporary_rejection",
			})
			.mockResolvedValueOnce({ status: "accepted", providerId: "smtp-id" });
		await enqueue();
		await dispatchCustomerEmails();
		expect(send).toHaveBeenCalledWith(
			"coco@example.org",
			"aaaabbbbccccdddd",
			expect.any(String),
			expect.objectContaining({
				from: "CoCo <coco@example.org>",
				to: "delivered@resend.dev",
			}),
		);
		if (scenario === "provider switch")
			vi.stubEnv("CUSTOMER_EMAIL_PROVIDER", "resend");
		await database.customerEmailDelivery.updateMany({
			where: { orderId },
			data:
				scenario === "expired lease"
					? { status: "processing", leaseUntil: new Date(0) }
					: { nextAttemptAt: new Date(0) },
		});
		await dispatchCustomerEmails();
		const row = await database.customerEmailDelivery.findFirstOrThrow({
			where: { orderId },
		});
		if (scenario === "temporary rejection") {
			expect(send).toHaveBeenCalledTimes(2);
			expect(row).toMatchObject({ status: "accepted", providerId: "smtp-id" });
		} else {
			expect(send).toHaveBeenCalledTimes(1);
			expect(row).toMatchObject({
				status: "review",
				lastError:
					scenario === "expired lease"
						? "gmail_unknown_result"
						: "email_provider_changed",
			});
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("refuses to finalize a send after its lease has been reclaimed", async () => {
		await enqueue();
		fetchMock.mockImplementationOnce(async () => {
			await database.customerEmailDelivery.updateMany({
				where: { orderId },
				data: { leaseToken: "next-worker" },
			});
			return Response.json({ id: "stale-result" });
		});
		expect(await dispatchCustomerEmails()).toEqual({
			enabled: true,
			processed: 0,
		});
		expect(
			await database.customerEmailDelivery.findFirstOrThrow({
				where: { orderId },
			}),
		).toMatchObject({
			status: "processing",
			leaseToken: "next-worker",
			providerId: null,
		});
	});

	it.each([
		["rate-limited", "skipped"],
		["lost lease after throttling", "review"],
		["timeout before throttling", "review"],
	] as const)("rechecks transfer validity after %s and ends in %s", async (scenario, expected) => {
		await enqueue();
		if (scenario === "timeout before throttling") {
			fetchMock.mockRejectedValueOnce(new Error("ambiguous result"));
			await dispatchCustomerEmails();
			await database.customerEmailDelivery.updateMany({
				where: { orderId },
				data: { nextAttemptAt: new Date(0) },
			});
		}
		fetchMock.mockResolvedValueOnce(
			Response.json(
				{
					name: "rate_limit_exceeded",
					statusCode: 429,
					message: "Try again later",
				},
				{ status: 429 },
			),
		);
		await dispatchCustomerEmails();
		const calls = fetchMock.mock.calls.length;
		await database.userTransaction.update({
			where: { id: attemptId },
			data: { declaredReceiptAt: new Date() },
		});
		await database.customerEmailDelivery.updateMany({
			where: { orderId },
			data:
				scenario === "lost lease after throttling"
					? {
							status: "processing",
							leaseToken: "expired",
							leaseUntil: new Date(0),
						}
					: { nextAttemptAt: new Date(0) },
		});
		await dispatchCustomerEmails();
		expect(fetchMock).toHaveBeenCalledTimes(calls);
		expect(
			await database.customerEmailDelivery.findFirstOrThrow({
				where: { orderId },
			}),
		).toMatchObject({
			status: expected,
			lastError: "notice_obsolete",
		});
	});

	it("avoids replay to a previous recipient after an ambiguous result", async () => {
		await enqueue();
		fetchMock.mockRejectedValueOnce(new Error("unknown result"));
		await dispatchCustomerEmails();
		vi.stubEnv("CUSTOMER_EMAIL_TEST_TO", "changed@example.org");
		await database.customerEmailDelivery.updateMany({
			where: { orderId },
			data: { nextAttemptAt: new Date(0) },
		});
		await dispatchCustomerEmails();
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(
			await database.customerEmailDelivery.findFirstOrThrow({
				where: { orderId },
			}),
		).toMatchObject({
			status: "review",
			lastError: "recipient_changed",
		});
	});

	it.each([
		"throttled",
		"ambiguous",
	] as const)("handles a partly collected pickup after a %s send", async (outcome) => {
		await database.$transaction((tx) =>
			enqueueCustomerEmail(tx, orderId, `pickup/4/${orderId}`, {
				kind: "pickup",
				shipmentId: 4,
				allocations: [{ packageId: 2, cartItemId: 20, quantity: "2" }],
			}),
		);
		const request = {
			from: "CoCo <pedidos@example.org>",
			to: "delivered@resend.dev",
			subject: "Retiro",
			text: "2 kg",
			html: "<p>2 kg</p>",
			quantityKey: "20:2",
		};
		vi.spyOn(templates, "buildEmailRequest")
			.mockResolvedValueOnce(request)
			.mockResolvedValueOnce({
				...request,
				text: "1 kg pendiente",
				html: "<p>1 kg</p>",
				quantityKey: "20:1",
			});
		if (outcome === "ambiguous")
			fetchMock.mockRejectedValueOnce(new Error("timeout"));
		else
			fetchMock.mockResolvedValueOnce(
				Response.json(
					{ name: "rate_limit_exceeded", statusCode: 429 },
					{ status: 429 },
				),
			);
		await dispatchCustomerEmails();
		await database.customerEmailDelivery.updateMany({
			where: { orderId },
			data: { nextAttemptAt: new Date(0) },
		});
		fetchMock.mockResolvedValueOnce(Response.json({ id: "corrected-email" }));
		await dispatchCustomerEmails();
		const saved = await database.customerEmailDelivery.findFirstOrThrow({
			where: { orderId },
		});
		if (outcome === "ambiguous") {
			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(saved).toMatchObject({
				status: "review",
				lastError: "quantities_changed",
			});
		} else {
			expect(fetchMock).toHaveBeenCalledTimes(2);
			const sent = fetchMock.mock.calls[1]?.[1];
			expect(new Headers(sent?.headers).get("idempotency-key")).toBe(
				`coco/email/${saved.id}/1`,
			);
			expect(JSON.parse(String(sent?.body))).toMatchObject({
				text: "1 kg pendiente",
			});
			expect(saved).toMatchObject({
				status: "accepted",
				providerId: "corrected-email",
			});
		}
	});

	it("rotates the key after the daily sweep misses the window for a wholly throttled delivery", async () => {
		await enqueue();
		fetchMock.mockResolvedValueOnce(
			Response.json(
				{
					name: "rate_limit_exceeded",
					statusCode: 429,
				},
				{ status: 429, headers: { "Retry-After": "86400" } },
			),
		);
		await dispatchCustomerEmails();
		const throttled = await database.customerEmailDelivery.findFirstOrThrow({
			where: { orderId },
		});
		expect(throttled).toMatchObject({
			status: "pending",
			lastError: "resend_http_429",
		});
		expect(throttled.nextAttemptAt.getTime()).toBeGreaterThan(
			Date.now() + 23 * 3_600_000,
		);
		await database.customerEmailDelivery.update({
			where: { id: throttled.id },
			data: {
				firstAttemptAt: new Date(Date.now() - 86_400_000),
				nextAttemptAt: new Date(0),
			},
		});
		fetchMock.mockResolvedValueOnce(Response.json({ id: "accepted-next-day" }));
		await dispatchCustomerEmails();
		const sent = fetchMock.mock.calls[1]?.[1];
		expect(new Headers(sent?.headers).get("idempotency-key")).toBe(
			`coco/email/${throttled.id}/1`,
		);
		expect(
			await database.customerEmailDelivery.findUniqueOrThrow({
				where: { id: throttled.id },
			}),
		).toMatchObject({
			status: "accepted",
			attempts: 2,
			providerId: "accepted-next-day",
		});
	});

	it("drains a backlog larger than one claim batch during a single invocation", async () => {
		await database.customerEmailDelivery.createMany({
			data: Array.from({ length: 28 }, (_, i) => ({
				orderId,
				environment: `test/${fixture}`,
				eventKey: `batch-${i}`,
				notice: { version: 1, kind: "transfer", attemptId },
			})),
		});
		fetchMock.mockImplementation(async () =>
			Response.json({ id: randomUUID() }),
		);
		expect(await dispatchCustomerEmails()).toEqual({
			enabled: true,
			processed: 28,
		});
		expect(
			await database.customerEmailDelivery.count({
				where: { orderId, status: "accepted" },
			}),
		).toBe(28);
	});

	it("sends an aged ambiguous delivery to review without contacting the provider", async () => {
		await enqueue();
		await database.customerEmailDelivery.updateMany({
			where: { orderId },
			data: {
				status: "processing",
				leaseToken: "stale",
				leaseUntil: new Date(0),
				firstAttemptAt: new Date(Date.now() - 86_400_000),
			},
		});
		await dispatchCustomerEmails();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(
			await database.customerEmailDelivery.findFirstOrThrow({
				where: { orderId },
			}),
		).toMatchObject({ status: "review", lastError: "idempotency_window" });
	});
});
