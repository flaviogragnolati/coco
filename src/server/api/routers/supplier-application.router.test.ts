import { TRPCError } from "@trpc/server";
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

function context(role?: Role, headers = new Headers()) {
	return {
		db: {},
		headers,
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
			null,
		);
	});

	it("hands the sender IP to the service", async () => {
		const headers = new Headers({
			"x-forwarded-for": "190.12.34.56, 10.0.0.1",
		});

		await caller(context(undefined, headers)).submit(application);

		expect(publicService.submit).toHaveBeenCalledWith(
			expect.anything(),
			{},
			"190.12.34.56",
		);
	});

	it("passes the rate limit refusal through to the form", async () => {
		const refusal = new TRPCError({
			code: "TOO_MANY_REQUESTS",
			message: "Ya recibimos tu solicitud. Si necesitás algo más, escribinos.",
		});
		vi.mocked(publicService.submit).mockRejectedValue(refusal);

		await expect(caller(context()).submit(application)).rejects.toMatchObject({
			code: "TOO_MANY_REQUESTS",
			message: refusal.message,
		});
	});

	it("hides storage failures behind a generic message", async () => {
		vi.mocked(publicService.submit).mockRejectedValue(
			new Error('relation "supplier_application" does not exist'),
		);
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		await expect(caller(context()).submit(application)).rejects.toMatchObject({
			code: "INTERNAL_SERVER_ERROR",
			message: "No pudimos registrar la solicitud",
		});
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
