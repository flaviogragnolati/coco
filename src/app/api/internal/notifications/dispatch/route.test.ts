import { beforeEach, expect, test, vi } from "vitest";
import { env } from "~/env";
import { dispatchCustomerEmails } from "~/server/services/notifications/customer-email-dispatcher";
import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("~/env", () => ({ env: { CRON_SECRET: undefined } }));
vi.mock("~/server/services/notifications/customer-email-dispatcher", () => ({
	dispatchCustomerEmails: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());

test.each([
	[undefined, "Bearer undefined"],
	["test-credential", "Bearer other-value"],
	["test-credential", ""],
])("requires a configured matching secret", async (secret, authorization) => {
	vi.mocked(env).CRON_SECRET = secret;
	const response = await GET(
		new Request("https://example.org/api", {
			headers: { authorization: authorization ?? "" },
		}),
	);
	expect(response.status).toBe(401);
	expect(response.headers.get("cache-control")).toBe("no-store");
	expect(dispatchCustomerEmails).not.toHaveBeenCalled();
});
test("invokes one scan for an authenticated scheduler", async () => {
	vi.mocked(env).CRON_SECRET = "test-credential";
	vi.mocked(dispatchCustomerEmails).mockResolvedValue({
		enabled: true,
		processed: 1,
	});
	const result = await GET(
		new Request("https://example.org/api", {
			headers: { authorization: "Bearer test-credential" },
		}),
	);
	expect(await result.json()).toEqual({ enabled: true, processed: 1 });
});
