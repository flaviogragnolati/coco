import { strToU8 } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./price-sheet.data", () => ({
	findPriceSheetProducts: vi.fn(),
	listPriceSheetCategories: vi.fn(),
	listPriceSheetDownloadProducts: vi.fn(),
	updatePriceSheetProductCategory: vi.fn(),
	updatePriceSheetTermsPrice: vi.fn(),
}));
vi.mock("./_base/admin-audit", () => ({
	writeAdminAuditLogs: vi.fn(),
}));

import { Prisma } from "~/prisma/client";
import { readXlsxSheet } from "~/server/lib/xlsx/xlsx-reader";
import { writeAdminAuditLogs } from "./_base/admin-audit";
import * as data from "./price-sheet.data";
import * as service from "./price-sheet.service";

const actor = { id: "admin-1", name: "Admin Uno", role: "admin" as const };
const nuts = { id: 1, name: "Frutos secos" };
const oils = { id: 2, name: "Aceites y despensa" };

function record(
	id: number,
	overrides: Partial<data.PriceSheetProductRecord> = {},
): data.PriceSheetProductRecord {
	return {
		id,
		name: `Producto ${id}`,
		unit: "kg",
		presentationContainer: null,
		presentationSize: null,
		deleted: false,
		category: nuts,
		productClientTerms: [
			{
				id: id * 10,
				currency: "ARS",
				unitPrice: new Prisma.Decimal("1000"),
				moq: new Prisma.Decimal("0.5"),
				moqPrice: new Prisma.Decimal("500"),
				step: new Prisma.Decimal("0.5"),
				stepPrice: new Prisma.Decimal("500"),
			},
		],
		...overrides,
	};
}

const tx = { tag: "tx" };
const database = {
	$transaction: vi.fn(async (callback: (client: object) => unknown) =>
		callback(tx),
	),
} as unknown as Parameters<typeof service.applyPriceSheet>[3];

const sheet = (text: string) => ({ name: "precios.csv", bytes: strToU8(text) });

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(data.findPriceSheetProducts).mockResolvedValue([
		record(1),
		record(2),
	]);
	vi.mocked(data.listPriceSheetCategories).mockResolvedValue([
		{ ...nuts, active: true },
		{ ...oils, active: true },
	]);
	vi.mocked(data.updatePriceSheetTermsPrice).mockResolvedValue(1);
	vi.mocked(data.updatePriceSheetProductCategory).mockResolvedValue(1);
});

const FILE = "id;precio nuevo;categoría\n1;1.500;\n2;;Aceites y despensa\n";

describe("applyPriceSheet", () => {
	it("edits the current terms in place and audits each change", async () => {
		const preview = await service.previewPriceSheet(sheet(FILE), database);

		const result = await service.applyPriceSheet(
			sheet(FILE),
			preview.changes,
			actor,
			database,
		);

		expect(result).toEqual({ priceCount: 1, categoryCount: 1 });
		expect(data.updatePriceSheetTermsPrice).toHaveBeenCalledWith(tx, {
			terms: record(1).productClientTerms[0],
			unitPrice: "1500.00",
			moqPrice: "750.00",
			stepPrice: "750.00",
			now: expect.any(Date),
		});
		expect(data.updatePriceSheetProductCategory).toHaveBeenCalledWith(tx, {
			productId: 2,
			from: 1,
			to: 2,
		});
		const [, audits] = vi.mocked(writeAdminAuditLogs).mock.calls[0] ?? [];
		expect(audits).toEqual([
			expect.objectContaining({
				action: "productClientTerms.priceSheetUpdate",
				entityId: "10",
				before: {
					unitPrice: "1000.00",
					moqPrice: "500.00",
					stepPrice: "500.00",
				},
				after: {
					unitPrice: "1500.00",
					moqPrice: "750.00",
					stepPrice: "750.00",
				},
			}),
			expect.objectContaining({
				action: "product.priceSheetUpdate",
				entityId: "2",
				before: { categoryId: 1 },
				after: { categoryId: 2 },
			}),
		]);
		const [price, category] = audits ?? [];
		expect(price?.metadata).toEqual({
			batchId: expect.any(String),
			fileName: "precios.csv",
			productId: 1,
		});
		expect((price?.metadata as { batchId: string }).batchId).toBe(
			(category?.metadata as { batchId: string }).batchId,
		);
	});

	it("refuses when the data changed since the preview, writing nothing", async () => {
		const preview = await service.previewPriceSheet(sheet(FILE), database);
		vi.mocked(data.findPriceSheetProducts).mockResolvedValue([
			record(1, {
				productClientTerms: [
					{
						...(record(1).productClientTerms[0] as NonNullable<
							data.PriceSheetProductRecord["productClientTerms"][number]
						>),
						unitPrice: new Prisma.Decimal("1100"),
					},
				],
			}),
			record(2),
		]);

		await expect(
			service.applyPriceSheet(sheet(FILE), preview.changes, actor, database),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(data.updatePriceSheetTermsPrice).not.toHaveBeenCalled();
		expect(writeAdminAuditLogs).not.toHaveBeenCalled();
	});

	it("refuses a file with any row error, writing nothing", async () => {
		const file = `${FILE}99;100;\n`;

		await expect(
			service.applyPriceSheet(sheet(file), [], actor, database),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(data.updatePriceSheetTermsPrice).not.toHaveBeenCalled();
		expect(data.updatePriceSheetProductCategory).not.toHaveBeenCalled();
	});

	it("aborts the transaction when a row moved under the conditional update", async () => {
		const preview = await service.previewPriceSheet(sheet(FILE), database);
		vi.mocked(data.updatePriceSheetTermsPrice).mockResolvedValue(0);

		await expect(
			service.applyPriceSheet(sheet(FILE), preview.changes, actor, database),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(writeAdminAuditLogs).not.toHaveBeenCalled();
	});

	it("refuses an unreadable file before opening a transaction", async () => {
		await expect(
			service.applyPriceSheet(sheet("nombre\nx"), [], actor, database),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(database.$transaction).not.toHaveBeenCalled();
	});
});

describe("buildPriceSheetDownload", () => {
	it("writes one row per product with its unit label and current unit price", async () => {
		vi.mocked(data.listPriceSheetDownloadProducts).mockResolvedValue([
			record(1),
			record(2, {
				unit: "piece",
				presentationContainer: "frasco",
				presentationSize: "370 g",
				category: null,
				productClientTerms: [
					{
						id: 20,
						currency: "ARS",
						unitPrice: null,
						moq: new Prisma.Decimal("2"),
						moqPrice: new Prisma.Decimal("3000"),
						step: null,
						stepPrice: null,
					},
				],
			}),
		]);

		const download = await service.buildPriceSheetDownload(
			database,
			new Date("2026-10-11T02:00:00Z"),
		);

		expect(download.fileName).toBe("precios-2026-10-10.xlsx");
		expect(readXlsxSheet(download.bytes).rows.map((row) => row.cells)).toEqual([
			{
				A: "id",
				B: "nombre",
				C: "unidad",
				D: "categoría",
				E: "precio actual",
				F: "precio nuevo",
			},
			{ A: "1", B: "Producto 1", C: "kg", D: "Frutos secos", E: "1000" },
			{ A: "2", B: "Producto 2", C: "frasco 370 g", E: "1500" },
		]);
	});
});
