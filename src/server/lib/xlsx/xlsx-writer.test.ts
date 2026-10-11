import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { readXlsxSheet } from "./xlsx-reader";
import { writeXlsxSheet, xlsxColumnLetter } from "./xlsx-writer";

describe("writeXlsxSheet", () => {
	it("round-trips strings and numbers through the reader", () => {
		const bytes = writeXlsxSheet({
			sheetName: "Precios",
			headerRow: true,
			columnWidths: [8, 40],
			rows: [
				["id", "nombre", "precio"],
				[12, 'Almendras <tostadas> & "saladas"', 19500.5],
				[13, "  Nuez  ", null],
				[14, "", 0],
			],
		});

		const sheet = readXlsxSheet(bytes);

		expect(sheet.name).toBe("Precios");
		expect(sheet.rows).toEqual([
			{ row: 1, cells: { A: "id", B: "nombre", C: "precio" } },
			{
				row: 2,
				cells: { A: "12", B: 'Almendras <tostadas> & "saladas"', C: "19500.5" },
				numericColumns: ["A", "C"],
			},
			{ row: 3, cells: { A: "13", B: "  Nuez  " }, numericColumns: ["A"] },
			{ row: 4, cells: { A: "14", C: "0" }, numericColumns: ["A", "C"] },
		]);
	});

	it("drops characters XML cannot carry", () => {
		const bytes = writeXlsxSheet({
			sheetName: "Hoja",
			rows: [["a\u0001b\u000bc"]],
		});

		expect(readXlsxSheet(bytes, "Hoja").rows[0]?.cells).toEqual({ A: "abc" });
	});

	it("bolds and freezes the header row only when asked", () => {
		const worksheet = (headerRow: boolean) =>
			new TextDecoder().decode(
				unzipSync(
					writeXlsxSheet({ sheetName: "Hoja", headerRow, rows: [["a"]] }),
				)["xl/worksheets/sheet1.xml"],
			);

		expect(worksheet(true)).toContain('state="frozen"');
		expect(worksheet(true)).toContain('s="1"');
		expect(worksheet(false)).not.toContain("frozen");
		expect(worksheet(false)).not.toContain('s="1"');
	});

	it("rejects a sheet name Excel would refuse", () => {
		expect(() => writeXlsxSheet({ sheetName: "a/b", rows: [] })).toThrow(
			/Invalid sheet name/,
		);
		expect(() =>
			writeXlsxSheet({ sheetName: "x".repeat(32), rows: [] }),
		).toThrow(/Invalid sheet name/);
	});

	it("rejects a non-finite number", () => {
		expect(() =>
			writeXlsxSheet({ sheetName: "Hoja", rows: [[Number.NaN]] }),
		).toThrow(/A1 is not a finite number/);
	});
});

describe("xlsxColumnLetter", () => {
	it("maps zero-based indexes to spreadsheet letters", () => {
		expect([0, 25, 26, 51, 52, 701, 702].map(xlsxColumnLetter)).toEqual([
			"A",
			"Z",
			"AA",
			"AZ",
			"BA",
			"ZZ",
			"AAA",
		]);
	});
});
