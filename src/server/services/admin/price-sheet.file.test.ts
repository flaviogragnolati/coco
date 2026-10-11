import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";

import { writeXlsxSheet } from "~/server/lib/xlsx/xlsx-writer";
import {
	PRICE_SHEET_COLUMNS,
	PRICE_SHEET_MAX_BYTES,
	PRICE_SHEET_MAX_ROWS,
	parseCsv,
	readPriceSheet,
} from "./price-sheet.file";

const csv = (text: string) => readPriceSheet("precios.csv", strToU8(text));

describe("readPriceSheet (.xlsx)", () => {
	it("reads the downloaded layout, keeping which cells are numbers", () => {
		const bytes = writeXlsxSheet({
			sheetName: "Precios",
			rows: [
				[...PRICE_SHEET_COLUMNS],
				[12, "Almendras", "kg", "Frutos secos", 19500, 21000.5],
				[13, "Nueces", "kg", "Frutos secos", 15000, null],
				[null, "nota al pie", null, null, null, null],
				[14, "Aceite", "botella 0,5 L", "Aceites y despensa", 9000, "9.500,50"],
			],
		});

		expect(readPriceSheet("precios.xlsx", bytes)).toEqual({
			ok: true,
			rows: [
				{
					rowNumber: 2,
					id: { text: "12", numeric: true },
					newPrice: { text: "21000.5", numeric: true },
					category: { text: "Frutos secos", numeric: false },
				},
				{
					rowNumber: 3,
					id: { text: "13", numeric: true },
					newPrice: null,
					category: { text: "Frutos secos", numeric: false },
				},
				{
					rowNumber: 5,
					id: { text: "14", numeric: true },
					newPrice: { text: "9.500,50", numeric: false },
					category: { text: "Aceites y despensa", numeric: false },
				},
			],
		});
	});

	it("matches headers by name, ignoring case, accents and order", () => {
		const bytes = writeXlsxSheet({
			sheetName: "Hoja1",
			rows: [
				["Precio_Nuevo", " CATEGORIA ", "ID"],
				[100, "Mixes", 7],
			],
		});

		const result = readPriceSheet("x.xlsx", bytes);

		expect(result.ok && result.rows[0]).toMatchObject({
			id: { text: "7" },
			newPrice: { text: "100" },
			category: { text: "Mixes" },
		});
	});

	it("explains a broken workbook", () => {
		const result = readPriceSheet("x.xlsx", strToU8("PK not a zip"));

		expect(result).toEqual({
			ok: false,
			error: expect.stringContaining("No se pudo leer el archivo .xlsx"),
		});
	});
});

describe("readPriceSheet (.csv)", () => {
	it("reads a semicolon file with es-AR decimals and quoted fields", () => {
		const result = csv(
			'﻿id;nombre;categoría;precio nuevo\r\n12;"Almendras; peladas";Frutos secos;19.500,50\r\n13;"Nuez ""mariposa""\nentera";;\r\n',
		);

		expect(result).toEqual({
			ok: true,
			rows: [
				{
					rowNumber: 2,
					id: { text: "12", numeric: false },
					newPrice: { text: "19.500,50", numeric: false },
					category: { text: "Frutos secos", numeric: false },
				},
				{
					rowNumber: 3,
					id: { text: "13", numeric: false },
					newPrice: null,
					category: null,
				},
			],
		});
	});

	it("reads a comma file with a plain decimal point", () => {
		const result = csv("id,precio nuevo\n12,19500.5\n");

		expect(result.ok && result.rows[0]?.newPrice).toEqual({
			text: "19500.5",
			numeric: false,
		});
	});

	it("falls back to Windows-1252 when the bytes are not UTF-8", () => {
		const header = Uint8Array.from([
			...strToU8("id;categor"),
			0xed,
			...strToU8("a\n1;Frutos secos\n"),
		]);

		const result = readPriceSheet("precios.csv", header);

		expect(result.ok && result.rows[0]?.category?.text).toBe("Frutos secos");
	});

	it("skips blank lines and rows without id, price or category", () => {
		const result = csv(
			"id;nombre;precio nuevo\n\n;solo nombre;\n12;;100\n;;\n",
		);

		expect(result.ok && result.rows.map((row) => row.rowNumber)).toEqual([4]);
	});
});

describe("readPriceSheet file errors", () => {
	it.each([
		["", "El archivo está vacío."],
		["\n \n\n", "El archivo está vacío."],
		["nombre;precio nuevo\nx;1", 'Falta la columna "id"'],
		["id;nombre\n1;x", 'Faltan las columnas "precio nuevo" y "categoría"'],
		["id;ID\n1;2", 'La columna "ID" está repetida.'],
	])("refuses %j", (text, error) => {
		expect(csv(text)).toEqual({
			ok: false,
			error: expect.stringContaining(error),
		});
	});

	it("refuses another file type", () => {
		expect(readPriceSheet("precios.xls", strToU8("id"))).toEqual({
			ok: false,
			error: "El archivo tiene que ser .xlsx o .csv.",
		});
	});

	it("refuses more rows than the limit", () => {
		const lines = Array.from(
			{ length: PRICE_SHEET_MAX_ROWS + 1 },
			(_, index) => `${index + 1};100`,
		);

		expect(csv(`id;precio nuevo\n${lines.join("\n")}`)).toEqual({
			ok: false,
			error: expect.stringContaining(`el máximo es ${PRICE_SHEET_MAX_ROWS}`),
		});
	});

	it("refuses a file above the size limit", () => {
		const bytes = new Uint8Array(PRICE_SHEET_MAX_BYTES + 1);

		expect(readPriceSheet("precios.csv", bytes)).toEqual({
			ok: false,
			error: "El archivo supera el máximo de 2 MB.",
		});
	});
});

describe("parseCsv", () => {
	it("picks the delimiter the header line uses more, ignoring quoted ones", () => {
		expect(parseCsv('"a,b,c";x;y\n1;2;3')).toEqual([
			["a,b,c", "x", "y"],
			["1", "2", "3"],
		]);
		expect(parseCsv("a,b;c,d\n1,2")).toEqual([
			["a", "b;c", "d"],
			["1", "2"],
		]);
	});

	it("keeps a trailing empty field and a last line without newline", () => {
		expect(parseCsv("a;b;\n1;2;")).toEqual([
			["a", "b", ""],
			["1", "2", ""],
		]);
	});
});
