import { afterEach, expect, test, vi } from "vitest";
import { sendCustomerEmail } from "./resend-email.service";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllGlobals());
const request = {
	from: "pedidos@example.org",
	to: "destino@example.org",
	subject: "Pedido",
	text: "Hola",
	html: "<p>Hola</p>",
};

test.each([
	[429, "rate_limit_exceeded", "retry"],
	[500, "internal_server_error", "retry"],
	[409, "concurrent_idempotent_requests", "retry"],
	[409, "invalid_idempotent_request", "review"],
	[422, "validation_error", "review"],
	[401, "invalid_api_key", "review"],
] as const)("classifies HTTP %s %s as %s", async (status, name, expected) => {
	const fetchMock = vi
		.fn()
		.mockResolvedValue(
			Response.json(
				{ statusCode: status, name, message: "Sensitive input from provider" },
				{ status, headers: { "Retry-After": "120" } },
			),
		);
	vi.stubGlobal("fetch", fetchMock);
	const result = await sendCustomerEmail("dummy-key", "delivery", request);
	expect(result).toMatchObject({
		status: expected,
		reason: `resend_http_${status}`,
	});
	if (result.status === "retry") expect(result.retryAfterMs).toBe(120000);
	expect(JSON.stringify(result)).not.toContain("Sensitive");
});
