import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "~/prisma/client";
import { buildEmailRequest } from "./customer-email.templates";
import { getEmailConfig, getEmailEnvironment } from "./email-config";

const config = {
	dispatch: true,
	environment: "live/example",
	from: "pedidos@example.org",
	origin: "https://coco.example.org",
};
const attempt = {
	id: 19,
	status: "pending",
	provider: "external",
	amount: "1234.50",
	currency: "ARS",
	expiresAt: new Date("2099-01-01T15:00:00Z"),
	declaredReceiptAt: null,
};
function render(
	kind: string,
	status: string,
	transactions: unknown[],
	testRecipient?: string,
	replacementOrder = false,
) {
	const order = {
		code: "ORD-AB",
		status,
		deliveryPreference: "homeDelivery",
		items: [
			{
				quantity: "1",
				productSnapshot: { product: { name: "A & B <C>", unit: "unit" } },
			},
		],
		transactions,
	};
	const tx = {
		userOrder: {
			findFirst: vi
				.fn()
				.mockResolvedValue(replacementOrder ? { id: 34 } : null),
			findUniqueOrThrow: vi
				.fn()
				.mockResolvedValueOnce(order)
				.mockResolvedValueOnce({
					user: { email: "buyer@example.org", active: true, deleted: false },
				}),
		},
	};
	return buildEmailRequest(
		tx as unknown as Prisma.TransactionClient,
		33,
		{ version: 1, kind, attemptId: 19 },
		{ ...config, testRecipient },
	);
}

describe("correos de pago", () => {
	it("usa el código público, importe del intento y productos escapados, con retorno al pedido", async () => {
		const email = await render("confirmed", "processing", [
			{ ...attempt, status: "completed" },
		]);
		expect(email?.to).toBe("buyer@example.org");
		expect(email?.subject).toContain("ORD-AB");
		expect(email?.html).toContain("A &amp; B &lt;C&gt;");
		expect(email?.text).toContain("A & B <C>");
		expect(email?.text).toContain("ARS");
		expect(email?.text).toMatch(/1\.?234,50/);
		expect(email?.html).toContain("/login?callbackURL=%2Fmy-orders%2F33");
	});
	it("lleva a Mis pedidos para la transferencia y fuerza destinatario en QA", async () => {
		const email = await render(
			"transfer",
			"pending",
			[attempt],
			"qa@example.org",
		);
		expect(email?.to).toBe("qa@example.org");
		expect(email?.text).toContain("12:00");
		expect(email?.text).toContain("Ver datos para transferir");
		expect(email?.text).not.toMatch(/CBU|alias|buyer@example/);
	});
	it("rechazo de transferencia sin exponer notas del operador", async () => {
		const email = await render("rejected", "failed", [
			{ ...attempt, status: "failed", failureMessage: "nota privada" },
		]);
		expect(email?.text).toContain("Transferencia");
		expect(email?.text).not.toContain("nota privada");
	});
	it("omite el rechazo externo cuando ya se abrió otro pedido sobre el mismo carrito", async () => {
		expect(
			await render(
				"rejected",
				"failed",
				[{ ...attempt, status: "failed" }],
				undefined,
				true,
			),
		).toBeNull();
	});
	it.each([
		["transfer", "pending", [{ ...attempt, declaredReceiptAt: new Date() }]],
		["transfer", "pending", [{ ...attempt, expiresAt: new Date(0) }]],
		[
			"rejected",
			"pending",
			[
				{ ...attempt, id: 20 },
				{ ...attempt, status: "failed" },
			],
		],
		[
			"rejected",
			"processing",
			[
				{ ...attempt, status: "failed" },
				{ ...attempt, id: 18, status: "completed" },
			],
		],
	] as const)("omite avisos obsoletos %s/%s", async (kind, status, transactions) => {
		expect(await render(kind, status, [...transactions])).toBeNull();
	});
});

describe("particiones de correo", () => {
	const source = {
		CUSTOMER_EMAIL_ENVIRONMENT: "qa",
		BETTER_AUTH_URL: "https://coco.example.org",
		RESEND_FROM: "pedidos@example.org",
		CUSTOMER_EMAIL_MODE: "test",
		CUSTOMER_EMAIL_TEST_TO: "qa@example.org",
	};
	it("es opt-in y solo reclama la partición configurada", () => {
		expect(getEmailConfig({})).toBeNull();
		expect(getEmailConfig(source)).toMatchObject({
			environment: "test/qa",
			testRecipient: "qa@example.org",
			dispatch: false,
		});
		expect(
			getEmailEnvironment({
				...source,
				CUSTOMER_EMAIL_MODE: "live",
				APP_ENV: "production",
			}),
		).toBe("live/qa");
	});
	it("exige destinatario fijo para pruebas e impide usar el modo live en preview", () => {
		expect(() =>
			getEmailConfig({ ...source, CUSTOMER_EMAIL_TEST_TO: "" }),
		).toThrow();
		expect(() =>
			getEmailConfig({
				...source,
				CUSTOMER_EMAIL_MODE: "live",
				APP_ENV: "production",
				VERCEL_ENV: "preview",
			}),
		).toThrow();
	});
});
