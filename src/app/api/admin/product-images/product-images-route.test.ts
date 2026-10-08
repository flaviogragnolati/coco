import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
	BLOB_READ_WRITE_TOKEN: "blob-token" as string | undefined,
}));

vi.mock("server-only", () => ({}));
vi.mock("~/env", () => ({ env: mockEnv }));
vi.mock("~/server/auth/api-route-guards", () => ({
	requireAdminApi: vi.fn(),
}));
vi.mock("@vercel/blob", () => ({ put: vi.fn() }));

import { put } from "@vercel/blob";
import { requireAdminApi } from "~/server/auth/api-route-guards";
import { POST } from "./route";

const actor = { id: "admin-1", name: "Admin", role: "admin" as const };
const authorized = { ok: true as const, session: {}, actor };
const PNG_BYTES = Uint8Array.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function uploadRequest(files: File[]) {
	const formData = new FormData();
	for (const file of files) formData.append("file", file);
	return new Request("http://localhost/api/admin/product-images", {
		method: "POST",
		body: formData,
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	mockEnv.BLOB_READ_WRITE_TOKEN = "blob-token";
	vi.mocked(requireAdminApi).mockResolvedValue(authorized as never);
});

describe("product image upload route", () => {
	it("returns the guard response without uploading", async () => {
		vi.mocked(requireAdminApi).mockResolvedValue({
			ok: false,
			response: Response.json({ error: "login" }, { status: 401 }),
		} as never);

		const response = await POST(
			uploadRequest([new File([PNG_BYTES], "a.png", { type: "image/png" })]),
		);

		expect(response.status).toBe(401);
		expect(put).not.toHaveBeenCalled();
	});

	it("answers 503 in Spanish when the Blob token is not configured", async () => {
		mockEnv.BLOB_READ_WRITE_TOKEN = undefined;

		const response = await POST(
			uploadRequest([new File([PNG_BYTES], "a.png", { type: "image/png" })]),
		);

		expect(response.status).toBe(503);
		expect((await response.json()).error).toContain("no está configurada");
		expect(put).not.toHaveBeenCalled();
	});

	it("stores one image under an unguessable products/ path and returns its public URL", async () => {
		vi.mocked(put).mockResolvedValue({
			url: "https://store.public.blob.vercel-storage.com/products/x.png",
		} as never);

		const response = await POST(
			uploadRequest([
				new File([PNG_BYTES], "foto mía.png", { type: "image/png" }),
			]),
		);

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({
			url: "https://store.public.blob.vercel-storage.com/products/x.png",
		});
		const [pathname, , options] = vi.mocked(put).mock.calls[0] ?? [];
		expect(pathname).toMatch(
			/^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/,
		);
		expect(options).toMatchObject({
			access: "public",
			contentType: "image/png",
			token: "blob-token",
		});
	});

	it("rejects more than one file", async () => {
		const file = new File([PNG_BYTES], "a.png", { type: "image/png" });

		const response = await POST(uploadRequest([file, file]));

		expect(response.status).toBe(400);
		expect(put).not.toHaveBeenCalled();
	});

	it("rejects a non-image disguised with an image MIME type", async () => {
		const response = await POST(
			uploadRequest([
				new File(["<svg onload=alert(1)>"], "a.png", { type: "image/png" }),
			]),
		);

		expect(response.status).toBe(415);
		expect(put).not.toHaveBeenCalled();
	});

	it("rejects an image larger than 4 MiB", async () => {
		const response = await POST(
			uploadRequest([
				new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.png", {
					type: "image/png",
				}),
			]),
		);

		expect(response.status).toBe(413);
		expect(put).not.toHaveBeenCalled();
	});

	it("maps a Blob failure to 502", async () => {
		vi.mocked(put).mockRejectedValue(new Error("store down"));

		const response = await POST(
			uploadRequest([new File([PNG_BYTES], "a.png", { type: "image/png" })]),
		);

		expect(response.status).toBe(502);
	});
});
