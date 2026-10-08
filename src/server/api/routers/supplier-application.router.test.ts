import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("~/server/better-auth", () => ({
	auth: { api: { getSession: vi.fn() } },
}));
vi.mock(
	"~/server/services/supplier-application/supplier-application.service",
	() => ({ submit: vi.fn() }),
);
vi.mock("~/server/services/admin/supplier-application.service", () => ({
	list: vi.fn().mockResolvedValue([]),
	markContacted: vi.fn(),
}));

import { createCallerFactory } from "~/server/api/trpc";
import * as adminService from "~/server/services/admin/supplier-application.service";
import * as publicService from "~/server/services/supplier-application/supplier-application.service";
import { supplierApplicationRouter as adminRouter } from "./admin/supplier-application.router";
import { supplierApplicationRouter as publicRouter } from "./supplier-application.router";

type Role = "user" | "admin" | "superadmin";

function context(role?: Role) {
	return {
		db: {},
		headers: new Headers(),
		session: role
			? {
					session: { id: "session-1" },
					user: {
						id: `${role}-1`,
						name: "Persona",
						role,
						active: true,
						deleted: false,
					},
				}
			: null,
	} as never;
}

const application = {
	contactName: "Ana Pérez",
	companyName: "Distribuidora Sur",
	email: "ana@distribuidorasur.com.ar",
	offering: "Yerba por bulto",
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("public supplierApplication router", () => {
	const caller = createCallerFactory(publicRouter);

	it("accepts a submission without a session", async () => {
		await expect(
			caller(context()).submit(application),
		).resolves.toBeUndefined();

		expect(publicService.submit).toHaveBeenCalledWith(
			expect.objectContaining({ ...application, phone: null }),
			{},
		);
	});

	it("validates the payload on the server before reaching the service", async () => {
		await expect(
			caller(context()).submit({ ...application, email: "", phone: "" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });

		expect(publicService.submit).not.toHaveBeenCalled();
	});
});

describe("admin supplierApplication router", () => {
	const caller = createCallerFactory(adminRouter);

	it.each([
		[undefined, "UNAUTHORIZED"],
		["user", "FORBIDDEN"],
	] as const)("refuses %s callers", async (role, code) => {
		await expect(
			caller(context(role)).list({ status: "all" }),
		).rejects.toMatchObject({ code });
		await expect(
			caller(context(role)).markContacted({ id: 1 }),
		).rejects.toMatchObject({ code });

		expect(adminService.list).not.toHaveBeenCalled();
		expect(adminService.markContacted).not.toHaveBeenCalled();
	});

	it("marks as contacted on behalf of the session admin", async () => {
		const contacted = {
			id: 1,
			...application,
			phone: null,
			contactedAt: new Date("2026-10-09T15:30:00.000Z"),
			contactedBy: { id: "admin-1", name: "Persona" },
			createdAt: new Date("2026-10-08T12:00:00.000Z"),
		};
		vi.mocked(adminService.markContacted).mockResolvedValue(contacted);

		await expect(
			caller(context("admin")).markContacted({ id: 1 }),
		).resolves.toEqual(contacted);
		expect(adminService.markContacted).toHaveBeenCalledWith(
			{ id: 1 },
			{ id: "admin-1", name: "Persona", role: "admin" },
			{},
		);
	});
});
