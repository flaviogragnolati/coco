import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("~/server/auth/api-route-guards", () => ({
	requireAdminApi: vi.fn(),
}));
vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("~/server/services/admin/qa-ticket.service", () => ({
	addImageEvidence: vi.fn(),
	getImageEvidence: vi.fn(),
	removeImageEvidence: vi.fn(),
}));

import { requireAdminApi } from "~/server/auth/api-route-guards";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import {
	addImageEvidence,
	getImageEvidence,
	removeImageEvidence,
} from "~/server/services/admin/qa-ticket.service";
import { POST } from "../qa-tickets/[ticketId]/images/route";
import { DELETE, GET } from "./[evidenceId]/route";

const actor = { id: "admin-1", name: "Admin", role: "admin" as const };
const authorized = { ok: true as const, session: {}, actor };

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(requireAdminApi).mockResolvedValue(authorized as never);
});

describe("QA ticket image routes", () => {
	it("returns the guard response without reading an anonymous upload", async () => {
		vi.mocked(requireAdminApi).mockResolvedValue({
			ok: false,
			response: Response.json({ error: "login" }, { status: 401 }),
		} as never);

		const response = await POST(
			new Request("http://localhost/api/admin/qa-tickets/1/images", {
				method: "POST",
			}),
			{ params: Promise.resolve({ ticketId: "1" }) },
		);

		expect(response.status).toBe(401);
		expect(addImageEvidence).not.toHaveBeenCalled();
	});

	it("accepts one multipart image and returns metadata without content", async () => {
		const metadata = {
			id: 9,
			kind: "image" as const,
			slot: 0,
			fileName: "capture.png",
			mimeType: "image/png",
			byteSize: 8,
			createdAt: new Date("2026-08-21T12:00:00Z"),
			updatedAt: new Date("2026-08-21T12:00:00Z"),
		};
		vi.mocked(addImageEvidence).mockResolvedValue(metadata);
		const formData = new FormData();
		formData.set(
			"file",
			new File(
				[Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
				"capture.png",
				{ type: "image/png" },
			),
		);

		const response = await POST(
			new Request("http://localhost/api/admin/qa-tickets/1/images", {
				method: "POST",
				body: formData,
			}),
			{ params: Promise.resolve({ ticketId: "1" }) },
		);

		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body).toMatchObject({ id: 9, fileName: "capture.png" });
		expect(JSON.stringify(body)).not.toContain("content");
	});

	it("rejects an image larger than 2 MiB before calling the service", async () => {
		const formData = new FormData();
		formData.set(
			"file",
			new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", {
				type: "image/png",
			}),
		);

		const response = await POST(
			new Request("http://localhost/api/admin/qa-tickets/1/images", {
				method: "POST",
				body: formData,
			}),
			{ params: Promise.resolve({ ticketId: "1" }) },
		);

		expect(response.status).toBe(413);
		expect(addImageEvidence).not.toHaveBeenCalled();
	});

	it("serves private binary bytes with safe headers", async () => {
		vi.mocked(getImageEvidence).mockResolvedValue({
			bytes: Buffer.from([1, 2, 3]),
			fileName: "captura ñ.png",
			mimeType: "image/png",
			byteSize: 3,
		});

		const response = await GET(
			new Request("http://localhost/api/admin/qa-ticket-evidence/9"),
			{ params: Promise.resolve({ evidenceId: "9" }) },
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(response.headers.get("content-type")).toBe("image/png");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			Uint8Array.from([1, 2, 3]),
		);
	});

	it("maps service conflicts during delete to HTTP 409", async () => {
		vi.mocked(removeImageEvidence).mockRejectedValue(
			new AdminCrudError("CONFLICT", "Ticket eliminado"),
		);

		const response = await DELETE(
			new Request("http://localhost/api/admin/qa-ticket-evidence/9", {
				method: "DELETE",
			}),
			{ params: Promise.resolve({ evidenceId: "9" }) },
		);

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: "Ticket eliminado" });
	});
});
