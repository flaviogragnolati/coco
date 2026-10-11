import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("~/server/db", () => ({ db: { tag: "db" } }));
vi.mock("~/server/auth/api-route-guards", () => ({
	requireAdminApi: vi.fn(),
}));
vi.mock("~/server/services/logging/app-logger.service", () => ({
	appLogger: { error: vi.fn() },
}));
vi.mock("~/server/services/admin/price-sheet.service", () => ({
	applyPriceSheet: vi.fn(),
	buildPriceSheetDownload: vi.fn(),
	previewPriceSheet: vi.fn(),
}));

import { requireAdminApi } from "~/server/auth/api-route-guards";
import { AdminCrudError } from "~/server/services/admin/_base/admin-crud.errors";
import { PRICE_SHEET_MAX_BYTES } from "~/server/services/admin/price-sheet.file";
import {
	applyPriceSheet,
	buildPriceSheetDownload,
	previewPriceSheet,
} from "~/server/services/admin/price-sheet.service";
import { POST as applyPost } from "./apply/route";
import { POST as previewPost } from "./preview/route";
import { GET } from "./route";

const actor = { id: "admin-1", name: "Admin", role: "admin" as const };
const BASE = "http://localhost/api/admin/price-sheet";

function upload(
	path: string,
	files: File[],
	fields: Record<string, string> = {},
) {
	const formData = new FormData();
	for (const file of files) formData.append("file", file);
	for (const [key, value] of Object.entries(fields)) formData.set(key, value);
	return new Request(`${BASE}${path}`, { method: "POST", body: formData });
}

const csvFile = () => new File(["id;precio nuevo\n1;100\n"], "precios.csv");
const change = {
	productId: 1,
	termsId: 10,
	price: { from: "90.00", to: "100.00" },
	category: null,
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(requireAdminApi).mockResolvedValue({
		ok: true,
		session: {},
		actor,
	} as never);
});

describe("price sheet routes", () => {
	it.each([
		["download", () => GET(new Request(BASE))],
		["preview", () => previewPost(upload("/preview", [csvFile()]))],
		[
			"apply",
			() =>
				applyPost(
					upload("/apply", [csvFile()], { expected: JSON.stringify([change]) }),
				),
		],
	])("returns the admin guard response on %s", async (_, call) => {
		vi.mocked(requireAdminApi).mockResolvedValue({
			ok: false,
			response: Response.json({ error: "login" }, { status: 401 }),
		} as never);

		const response = await call();

		expect(response.status).toBe(401);
		expect(buildPriceSheetDownload).not.toHaveBeenCalled();
		expect(previewPriceSheet).not.toHaveBeenCalled();
		expect(applyPriceSheet).not.toHaveBeenCalled();
	});

	it("serves the sheet as an xlsx attachment", async () => {
		vi.mocked(buildPriceSheetDownload).mockResolvedValue({
			fileName: "precios-2026-10-11.xlsx",
			bytes: Uint8Array.from([0x50, 0x4b]),
		});

		const response = await GET(new Request(BASE));

		expect(response.status).toBe(200);
		expect(response.headers.get("content-disposition")).toBe(
			'attachment; filename="precios-2026-10-11.xlsx"',
		);
		expect(response.headers.get("content-type")).toContain("spreadsheetml");
		expect(response.headers.get("cache-control")).toBe("private, no-store");
	});

	it("previews exactly one uploaded file", async () => {
		vi.mocked(previewPriceSheet).mockResolvedValue({ rows: [] } as never);

		const response = await previewPost(upload("/preview", [csvFile()]));

		expect(response.status).toBe(200);
		const [file] = vi.mocked(previewPriceSheet).mock.calls[0] ?? [];
		expect(file?.name).toBe("precios.csv");
		expect(new TextDecoder().decode(file?.bytes)).toContain("id;precio nuevo");
	});

	it("rejects zero or several files and a file above 2 MB", async () => {
		const none = await previewPost(upload("/preview", []));
		const two = await previewPost(upload("/preview", [csvFile(), csvFile()]));
		const big = await previewPost(
			upload("/preview", [
				new File([new Uint8Array(PRICE_SHEET_MAX_BYTES + 1)], "big.csv"),
			]),
		);

		expect([none.status, two.status, big.status]).toEqual([400, 400, 413]);
		expect(previewPriceSheet).not.toHaveBeenCalled();
	});

	it("stops reading a streamed body without Content-Length past the cap", async () => {
		let pulled = 0;
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				pulled += 1;
				controller.enqueue(new Uint8Array(1024 * 1024));
			},
		});
		const request = new Request(`${BASE}/preview`, {
			method: "POST",
			body,
			headers: { "content-type": "multipart/form-data; boundary=x" },
			duplex: "half",
		} as RequestInit);

		const response = await previewPost(request);

		expect(response.status).toBe(413);
		expect(pulled).toBeLessThan(10);
		expect(previewPriceSheet).not.toHaveBeenCalled();
	});

	it("maps a sheet error to 400 with its message", async () => {
		vi.mocked(previewPriceSheet).mockRejectedValue(
			new AdminCrudError("BAD_REQUEST", "El archivo está vacío."),
		);

		const response = await previewPost(upload("/preview", [csvFile()]));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "El archivo está vacío." });
	});

	it("refuses to apply without the previewed changes", async () => {
		const missing = await applyPost(upload("/apply", [csvFile()]));
		const malformed = await applyPost(
			upload("/apply", [csvFile()], { expected: '[{"productId":"x"}]' }),
		);

		expect([missing.status, malformed.status]).toEqual([400, 400]);
		expect(applyPriceSheet).not.toHaveBeenCalled();
	});

	it("applies with the admin actor and the previewed changes", async () => {
		vi.mocked(applyPriceSheet).mockResolvedValue({
			priceCount: 1,
			categoryCount: 0,
		});

		const response = await applyPost(
			upload("/apply", [csvFile()], { expected: JSON.stringify([change]) }),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ priceCount: 1, categoryCount: 0 });
		expect(applyPriceSheet).toHaveBeenCalledWith(
			expect.objectContaining({ name: "precios.csv" }),
			[change],
			actor,
			{ tag: "db" },
		);
	});

	it("answers 409 when the data changed since the preview", async () => {
		vi.mocked(applyPriceSheet).mockRejectedValue(
			new AdminCrudError("CONFLICT", "cambió"),
		);

		const response = await applyPost(
			upload("/apply", [csvFile()], { expected: JSON.stringify([change]) }),
		);

		expect(response.status).toBe(409);
	});
});
