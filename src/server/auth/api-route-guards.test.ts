import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("~/server/better-auth", () => ({
	auth: { api: { getSession: vi.fn() } },
}));

import { auth } from "~/server/better-auth";
import { requireAdminApi } from "./api-route-guards";

const getSession = vi.mocked(auth.api.getSession);

beforeEach(() => {
	vi.clearAllMocks();
});

function request() {
	return new Request("http://localhost/api/admin/test", {
		headers: { cookie: "better-auth.session_token=test" },
	});
}

function session(
	overrides: Partial<{
		id: string;
		name: string;
		role: "user" | "admin" | "superadmin";
		active: boolean;
		deleted: boolean;
	}> = {},
) {
	return {
		session: { id: "session-1" },
		user: {
			id: "user-1",
			name: "QA Admin",
			role: "admin" as const,
			active: true,
			deleted: false,
			...overrides,
		},
	};
}

describe("requireAdminApi", () => {
	it("returns JSON 401 for an anonymous request", async () => {
		getSession.mockResolvedValue(null);

		const result = await requireAdminApi(request());

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.response.status).toBe(401);
	});

	it("returns JSON 403 for inactive and non-admin users", async () => {
		for (const current of [
			session({ active: false }),
			session({ role: "user" }),
		]) {
			getSession.mockResolvedValue(current as never);
			const result = await requireAdminApi(request());
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.response.status).toBe(403);
				expect(result.response.headers.get("content-type")).toContain(
					"application/json",
				);
			}
		}
	});

	it("rejects cross-origin mutations before resolving a session", async () => {
		const crossOriginRequest = new Request("http://localhost/api/admin/test", {
			method: "POST",
			headers: { origin: "https://attacker.example" },
		});

		const result = await requireAdminApi(crossOriginRequest);

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.response.status).toBe(403);
		expect(getSession).not.toHaveBeenCalled();
	});

	it("returns the active admin session and audit actor", async () => {
		getSession.mockResolvedValue(session({ role: "superadmin" }) as never);

		const result = await requireAdminApi(request());

		expect(result).toMatchObject({
			ok: true,
			actor: { id: "user-1", name: "QA Admin", role: "superadmin" },
		});
		expect(getSession).toHaveBeenCalledWith({ headers: request().headers });
	});
});
