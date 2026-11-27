import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "~/prisma/client";

const url = process.env.CUSTOMER_EMAIL_TEST_DATABASE_URL;
const id = crypto.randomUUID();
let client: PrismaClient;
vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({
	get db() {
		return client;
	},
}));
vi.mock("~/server/events/domain-event-dispatcher", () => ({
	DomainEventDispatcher: { wake: vi.fn() },
}));
vi.mock("./external/external-payment-config.service", async (load) => {
	const original =
		await load<typeof import("./external/external-payment-config.service")>();
	return {
		...original,
		getExternalPaymentConfig: async () => ({
			enabled: true,
			settings: {
				...original.defaultExternalPaymentSettings,
				transferDiscountPercent: 10,
			},
		}),
	};
});

describe.skipIf(!url)("transactional payment mail on PostgreSQL", () => {
	let pointId: number;
	let termsId: number;
	let productId: number;
	let methodId: number;
	const actor = { id, role: "admin" as const };

	beforeAll(async () => {
		if (!url) throw new Error("Missing disposable database URL");
		const target = new URL(url);
		if (
			!["localhost", "127.0.0.1"].includes(target.hostname) ||
			!target.pathname.endsWith("_test")
		) {
			throw new Error(
				"Customer email integration tests require a local *_test database.",
			);
		}
		vi.stubEnv("APP_ENV", "test");
		vi.stubEnv("DATABASE_URL", url);
		vi.stubEnv("BETTER_AUTH_GOOGLE_CLIENT_ID", "test");
		vi.stubEnv("BETTER_AUTH_GOOGLE_CLIENT_SECRET", "test");
		vi.stubEnv("CUSTOMER_EMAIL_MODE", "test");
		vi.stubEnv("CUSTOMER_EMAIL_ENVIRONMENT", id);
		vi.stubEnv("CUSTOMER_EMAIL_TEST_TO", "delivered@resend.dev");
		vi.stubEnv("RESEND_FROM", "orders@example.org");
		vi.stubEnv("BETTER_AUTH_URL", "https://example.org");
		vi.stubEnv("CUSTOMER_EMAIL_DISPATCH", "false");
		client = new PrismaClient({
			adapter: new PrismaPg({ connectionString: url }),
		});
		await client.user.create({
			data: { id, name: "Comprador", email: `${id}@example.org` },
		});
		const method = await client.paymentMethod.create({
			data: {
				userId: id,
				type: "bank_transfer",
				provider: "external",
				label: "Pago externo",
				details: "Transferencia",
			},
		});
		methodId = method.id;
		const point = await client.pickupPoint.create({
			data: {
				name: id,
				line1: "Av. San Martín 1",
				city: "Ushuaia",
				state: "Tierra del Fuego",
				hours: "Lunes a viernes",
			},
		});
		pointId = point.id;
		const product = await client.product.create({
			data: { name: id, unit: "kg", images: [] },
		});
		productId = product.id;
		const terms = await client.productClientTerms.create({
			data: { productId, moq: 1, moqPrice: 500, unitPrice: 500 },
		});
		termsId = terms.id;
		await client.cart.create({
			data: {
				code: id,
				userId: id,
				status: "atCheckout",
				cartItems: {
					create: {
						code: id,
						quantity: 1,
						productClientTermsId: termsId,
						productSnapshot: { name: id, unit: "kg" },
					},
				},
			},
		});
	});

	afterAll(async () => {
		vi.unstubAllEnvs();
		if (!client) return;
		try {
			const order = { userOrder: { userId: id } };
			const cartItem = await client.cartItem.findUnique({
				where: { code: id },
			});
			if (cartItem)
				await client.domainEventOutbox.deleteMany({
					where: {
						aggregateType: "CartItem",
						aggregateId: String(cartItem.id),
						eventType: "cart.item.submittedToOrder",
					},
				});
			await client.auditLog.deleteMany({ where: { actorReference: id } });
			await client.customerEmailDelivery.deleteMany({
				where: { environment: `test/${id}` },
			});
			await client.userTransaction.deleteMany({ where: order });
			await client.userOrderItem.deleteMany({ where: order });
			await client.userOrder.deleteMany({ where: { userId: id } });
			await client.cartItem.deleteMany({ where: { cart: { userId: id } } });
			await client.cart.deleteMany({ where: { userId: id } });
			await client.paymentMethod.deleteMany({ where: { userId: id } });
			if (termsId)
				await client.productClientTerms.delete({ where: { id: termsId } });
			if (productId) await client.product.delete({ where: { id: productId } });
			if (pointId) await client.pickupPoint.delete({ where: { id: pointId } });
			await client.user.deleteMany({ where: { id } });
		} finally {
			await client.$disconnect();
		}
	});

	it("commits each notice with its money transition, including retries and a rolled back settlement", async () => {
		const { confirmAndPay } = await import("../checkout/checkout.service");
		const { settleExternalAttempt, rejectExternalAttempt } = await import(
			"../admin/payment.service"
		);
		const audit = await import("../admin/_base/admin-audit");
		const confirm = (key: string) =>
			confirmAndPay(id, {
				idempotencyKey: key,
				acceptedTerms: true,
				paymentMethodId: methodId,
				expectedAmount: "450.00",
				delivery: { mode: "pickupPoint", pickupPointId: pointId },
			});
		const keys = async (orderId: number) =>
			(
				await client.customerEmailDelivery.findMany({
					where: { orderId },
					orderBy: { createdAt: "asc" },
				})
			).map((r) => r.eventKey);
		const key = crypto.randomUUID();
		const first = await confirm(key);
		const duplicate = await confirm(key);
		expect(duplicate.transaction.id).toBe(first.transaction.id);
		expect(first.externalPayment).toMatchObject({
			amount: "450",
			expiresAt: expect.any(Date),
		});
		await rejectExternalAttempt(
			{ id: first.transaction.id, reason: "Transferencia sin acreditar" },
			actor,
		);
		expect(await keys(first.order.id)).toEqual([
			`transfer/${first.transaction.id}`,
			`rejected/${first.transaction.id}`,
		]);

		const second = await confirm(crypto.randomUUID());
		const input = {
			id: second.transaction.id,
			receiptReference: "referencia",
			note: null,
		};
		const auditFailure = vi
			.spyOn(audit, "writeAdminAuditLog")
			.mockRejectedValueOnce(new Error("abort settlement"));
		try {
			await expect(settleExternalAttempt(input, actor)).rejects.toThrow(
				"abort settlement",
			);
		} finally {
			auditFailure.mockRestore();
		}
		expect(
			await client.userTransaction.findUniqueOrThrow({
				where: { id: input.id },
			}),
		).toMatchObject({ status: "pending" });
		expect(await keys(second.order.id)).toEqual([`transfer/${input.id}`]);
		const candidates = await Promise.allSettled([
			settleExternalAttempt(input, actor),
			settleExternalAttempt(input, actor),
		]);
		expect(candidates.filter((r) => r.status === "fulfilled")).toHaveLength(1);
		expect(
			await client.userOrder.findUniqueOrThrow({
				where: { id: second.order.id },
			}),
		).toMatchObject({ status: "processing" });
		expect(await keys(second.order.id)).toEqual([
			`transfer/${input.id}`,
			`confirm/${second.order.id}`,
		]);
	});
});
