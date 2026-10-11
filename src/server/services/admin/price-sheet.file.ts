import { readXlsxSheet } from "~/server/lib/xlsx/xlsx-reader";

export const PRICE_SHEET_MAX_BYTES = 2 * 1024 * 1024;
export const PRICE_SHEET_MAX_ROWS = 2000;

/** The downloaded sheet's columns; the upload reads `id`, `precio nuevo` and `categoría`. */
export const PRICE_SHEET_COLUMNS = [
	"id",
	"nombre",
	"unidad",
	"categoría",
	"precio actual",
	"precio nuevo",
] as const;

export type PriceSheetCell = { text: string; numeric: boolean };

export type PriceSheetRow = {
	rowNumber: number;
	id: PriceSheetCell | null;
	newPrice: PriceSheetCell | null;
	category: PriceSheetCell | null;
};

export type PriceSheetReadResult =
	| { ok: true; rows: PriceSheetRow[] }
	| { ok: false; error: string };

type GridRow = { rowNumber: number; cells: (PriceSheetCell | undefined)[] };

/** Case, accent and spacing-insensitive form used to match headers and category names. */
export function normalizeLabel(value: string) {
	return value
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[_\s]+/g, " ")
		.trim();
}

const HEADER_KEYS = {
	id: "id",
	"precio nuevo": "newPrice",
	categoria: "category",
} as const satisfies Record<string, keyof Omit<PriceSheetRow, "rowNumber">>;

type HeaderKey = (typeof HEADER_KEYS)[keyof typeof HEADER_KEYS];

function columnIndex(letters: string) {
	let index = 0;
	for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
	return index - 1;
}

// 2000 rows of six columns stay far below this once inflated; the reader's
// general cap would let a 2 MB upload parse 20 MB of XML per part.
const XLSX_MAX_ENTRY_BYTES = 5 * 1024 * 1024;

function xlsxGrid(bytes: Uint8Array): GridRow[] {
	return readXlsxSheet(bytes, undefined, {
		maxEntryBytes: XLSX_MAX_ENTRY_BYTES,
	}).rows.map((row) => {
		const numeric = new Set(row.numericColumns ?? []);
		const cells: (PriceSheetCell | undefined)[] = [];
		for (const [letters, text] of Object.entries(row.cells)) {
			cells[columnIndex(letters)] = { text, numeric: numeric.has(letters) };
		}
		return { rowNumber: row.row, cells };
	});
}

function decodeText(bytes: Uint8Array) {
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		// Excel's "CSV" export on Windows writes the ANSI code page.
		return new TextDecoder("windows-1252").decode(bytes);
	}
}

function countOutsideQuotes(line: string, character: string) {
	let count = 0;
	let quoted = false;
	for (const current of line) {
		if (current === '"') quoted = !quoted;
		else if (current === character && !quoted) count += 1;
	}
	return count;
}

/** RFC 4180 records; the delimiter is whichever of `;` and `,` the first line uses more. */
export function parseCsv(text: string): string[][] {
	const source = text.replace(/^﻿/, "");
	const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
	const delimiter =
		countOutsideQuotes(firstLine, ";") > countOutsideQuotes(firstLine, ",")
			? ";"
			: ",";

	const records: string[][] = [];
	let record: string[] = [];
	let field = "";
	let quoted = false;

	for (let index = 0; index < source.length; index += 1) {
		const character = source[index];
		if (quoted) {
			if (character === '"' && source[index + 1] === '"') {
				field += '"';
				index += 1;
			} else if (character === '"') {
				quoted = false;
			} else {
				field += character;
			}
		} else if (character === '"' && field === "") {
			quoted = true;
		} else if (character === delimiter) {
			record.push(field);
			field = "";
		} else if (character === "\n" || character === "\r") {
			if (character === "\r" && source[index + 1] === "\n") index += 1;
			record.push(field);
			records.push(record);
			record = [];
			field = "";
		} else {
			field += character;
		}
	}
	if (field !== "" || record.length > 0) {
		record.push(field);
		records.push(record);
	}
	return records;
}

function csvGrid(bytes: Uint8Array): GridRow[] {
	return parseCsv(decodeText(bytes)).map((record, index) => ({
		rowNumber: index + 1,
		cells: record.map((text) => ({ text, numeric: false })),
	}));
}

function isBlank(cell: PriceSheetCell | undefined) {
	return cell === undefined || cell.text.trim() === "";
}

function isZip(bytes: Uint8Array) {
	return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function readGrid(fileName: string, bytes: Uint8Array) {
	const extension = fileName.toLowerCase().split(".").pop();
	if (extension === "xlsx" || isZip(bytes)) {
		try {
			return { ok: true as const, grid: xlsxGrid(bytes) };
		} catch {
			return {
				ok: false as const,
				error:
					"No se pudo leer el archivo .xlsx. Guardalo de nuevo desde Excel o subilo como .csv.",
			};
		}
	}
	if (extension === "csv") return { ok: true as const, grid: csvGrid(bytes) };
	return {
		ok: false as const,
		error: "El archivo tiene que ser .xlsx o .csv.",
	};
}

export function readPriceSheet(
	fileName: string,
	bytes: Uint8Array,
): PriceSheetReadResult {
	if (bytes.byteLength > PRICE_SHEET_MAX_BYTES) {
		return { ok: false, error: "El archivo supera el máximo de 2 MB." };
	}
	const read = readGrid(fileName, bytes);
	if (!read.ok) return read;

	const rows = read.grid.filter((row) => row.cells.some((c) => !isBlank(c)));
	const [header, ...body] = rows;
	if (!header) return { ok: false, error: "El archivo está vacío." };

	const columns = new Map<HeaderKey, number>();
	for (const [index, cell] of header.cells.entries()) {
		if (!cell) continue;
		const key =
			HEADER_KEYS[normalizeLabel(cell.text) as keyof typeof HEADER_KEYS];
		if (!key) continue;
		if (columns.has(key)) {
			return {
				ok: false,
				error: `La columna "${cell.text.trim()}" está repetida.`,
			};
		}
		columns.set(key, index);
	}

	if (!columns.has("id")) {
		return {
			ok: false,
			error:
				'Falta la columna "id" en la primera fila. Usá la planilla descargada.',
		};
	}
	if (!columns.has("newPrice") && !columns.has("category")) {
		return {
			ok: false,
			error: 'Faltan las columnas "precio nuevo" y "categoría".',
		};
	}

	const cellAt = (row: GridRow, key: HeaderKey) => {
		const index = columns.get(key);
		const cell = index === undefined ? undefined : row.cells[index];
		return !cell || isBlank(cell)
			? null
			: { text: cell.text.trim(), numeric: cell.numeric };
	};

	const parsed = body
		.map((row) => ({
			rowNumber: row.rowNumber,
			id: cellAt(row, "id"),
			newPrice: cellAt(row, "newPrice"),
			category: cellAt(row, "category"),
		}))
		.filter((row) => row.id || row.newPrice || row.category);

	if (parsed.length > PRICE_SHEET_MAX_ROWS) {
		return {
			ok: false,
			error: `La planilla tiene ${parsed.length} filas; el máximo es ${PRICE_SHEET_MAX_ROWS}.`,
		};
	}
	return { ok: true, rows: parsed };
}
