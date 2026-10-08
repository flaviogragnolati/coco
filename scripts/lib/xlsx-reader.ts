import { XMLParser } from "fast-xml-parser";
import { strFromU8, type UnzipFileInfo, unzipSync } from "fflate";

/**
 * Minimal read-only `.xlsx` reader: one worksheet resolved by name, cached cell
 * values as text, and merged ranges. Formulas are never evaluated (the cached
 * `<v>` is what the author last saw) and nothing outside the workbook, shared
 * strings and the target sheet is decompressed.
 */

export type XlsxCellValues = Record<string, string>;

export type XlsxRow = {
	row: number;
	/** Column letter → cached value as text; empty cells are absent. */
	cells: XlsxCellValues;
};

export type XlsxMergeRange = {
	ref: string;
	startRow: number;
	endRow: number;
	startColumn: string;
	endColumn: string;
};

export type XlsxSheet = {
	name: string;
	rows: XlsxRow[];
	merges: XlsxMergeRange[];
};

export const XLSX_MAX_ENTRY_BYTES = 20 * 1024 * 1024;

const WORKBOOK_PATH = "xl/workbook.xml";
const WORKBOOK_RELS_PATH = "xl/_rels/workbook.xml.rels";
const SHARED_STRINGS_PATH = "xl/sharedStrings.xml";
const WORKSHEET_PATH = /^xl\/worksheets\/sheet\d+\.xml$/;

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	parseTagValue: false,
	trimValues: false,
	processEntities: true,
	htmlEntities: false,
	isArray: (tagName) =>
		["si", "r", "row", "c", "mergeCell", "sheet", "Relationship"].includes(
			tagName,
		),
});

type XmlNode = Record<string, unknown>;

function parseXml(xml: string, path: string): XmlNode {
	// Workbook parts never carry a DTD; refusing one closes entity expansion.
	if (/<!DOCTYPE/i.test(xml)) {
		throw new Error(`${path} declares a DOCTYPE, refusing to parse it`);
	}
	return xmlParser.parse(xml) as XmlNode;
}

function asNode(value: unknown): XmlNode | undefined {
	return value !== null && typeof value === "object"
		? (value as XmlNode)
		: undefined;
}

function asNodes(value: unknown): XmlNode[] {
	return Array.isArray(value)
		? value.map(asNode).filter((node) => node !== undefined)
		: [];
}

function attribute(node: XmlNode, name: string): string | undefined {
	const value = node[`@_${name}`];
	return typeof value === "string" ? value : undefined;
}

function textOf(value: unknown): string {
	if (value === undefined || value === null) return "";
	if (typeof value === "string") return value;
	const node = asNode(value);
	const text = node?.["#text"];
	return typeof text === "string" ? text : "";
}

/** Plain `<t>` or the concatenated `<r><t>` runs; phonetic `<rPh>` is skipped. */
function stringItemText(item: XmlNode): string {
	const runs = asNodes(item.r);
	if (runs.length > 0) return runs.map((run) => textOf(run.t)).join("");
	return textOf(item.t);
}

function unzipWorkbookParts(bytes: Uint8Array) {
	const filter = (file: UnzipFileInfo) => {
		const wanted =
			file.name === WORKBOOK_PATH ||
			file.name === WORKBOOK_RELS_PATH ||
			file.name === SHARED_STRINGS_PATH ||
			WORKSHEET_PATH.test(file.name);
		if (wanted && file.originalSize > XLSX_MAX_ENTRY_BYTES) {
			throw new Error(
				`${file.name} expands to ${file.originalSize} bytes, above the ${XLSX_MAX_ENTRY_BYTES} byte limit`,
			);
		}
		return wanted;
	};

	try {
		return unzipSync(bytes, { filter });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("byte limit")) throw error;
		throw new Error(`Not a readable .xlsx (zip) file: ${message}`);
	}
}

function resolveSheetPath(
	files: Record<string, Uint8Array>,
	sheetName: string,
): string {
	const workbookBytes = files[WORKBOOK_PATH];
	const relsBytes = files[WORKBOOK_RELS_PATH];
	if (!workbookBytes || !relsBytes) {
		throw new Error("The file has no xl/workbook.xml or its relationships");
	}

	const workbook = parseXml(strFromU8(workbookBytes), WORKBOOK_PATH);
	const sheets = asNodes(
		asNode(asNode(workbook.workbook)?.sheets)?.sheet ?? [],
	);
	const sheet = sheets.find((node) => attribute(node, "name") === sheetName);
	if (!sheet) {
		const names = sheets.map((node) => attribute(node, "name")).join(", ");
		throw new Error(`Sheet "${sheetName}" not found (sheets: ${names})`);
	}

	const relationshipId = attribute(sheet, "r:id");
	const rels = parseXml(strFromU8(relsBytes), WORKBOOK_RELS_PATH);
	const relationship = asNodes(
		asNode(rels.Relationships)?.Relationship ?? [],
	).find((node) => attribute(node, "Id") === relationshipId);
	const target = relationship ? attribute(relationship, "Target") : undefined;
	if (!target) {
		throw new Error(`Sheet "${sheetName}" has no worksheet relationship`);
	}

	const path = target.startsWith("/")
		? target.slice(1)
		: `xl/${target.replace(/^\.\//, "")}`;
	if (!WORKSHEET_PATH.test(path)) {
		throw new Error(`Sheet "${sheetName}" points outside xl/worksheets`);
	}
	return path;
}

function readSharedStrings(files: Record<string, Uint8Array>): string[] {
	const bytes = files[SHARED_STRINGS_PATH];
	if (!bytes) return [];
	const document = parseXml(strFromU8(bytes), SHARED_STRINGS_PATH);
	return asNodes(asNode(document.sst)?.si ?? []).map(stringItemText);
}

function splitReference(reference: string) {
	const match = /^([A-Z]+)(\d+)$/.exec(reference);
	if (!match?.[1] || !match[2]) {
		throw new Error(`Invalid cell reference "${reference}"`);
	}
	return { column: match[1], row: Number(match[2]) };
}

function cellValue(cell: XmlNode, sharedStrings: string[]): string {
	const type = attribute(cell, "t");
	if (type === "inlineStr") return stringItemText(asNode(cell.is) ?? {});

	const raw = textOf(cell.v);
	if (type === "s") {
		const value = sharedStrings[Number(raw)];
		if (value === undefined) {
			throw new Error(`Shared string ${raw} is out of range`);
		}
		return value;
	}
	return raw;
}

export function readXlsxSheet(bytes: Uint8Array, sheetName: string): XlsxSheet {
	const files = unzipWorkbookParts(bytes);
	const sheetPath = resolveSheetPath(files, sheetName);
	const sheetBytes = files[sheetPath];
	if (!sheetBytes) throw new Error(`${sheetPath} is missing from the file`);

	const sharedStrings = readSharedStrings(files);
	const worksheet = asNode(
		parseXml(strFromU8(sheetBytes), sheetPath).worksheet,
	);

	const rows: XlsxRow[] = [];
	for (const rowNode of asNodes(asNode(worksheet?.sheetData)?.row ?? [])) {
		const cells: XlsxCellValues = {};
		let rowNumber = Number(attribute(rowNode, "r"));
		for (const cell of asNodes(rowNode.c ?? [])) {
			const reference = attribute(cell, "r");
			if (!reference) throw new Error("Cell without a reference");
			const { column, row } = splitReference(reference);
			rowNumber = row;
			const value = cellValue(cell, sharedStrings);
			if (value !== "") cells[column] = value;
		}
		if (Object.keys(cells).length > 0) rows.push({ row: rowNumber, cells });
	}

	const merges = asNodes(
		asNode(worksheet?.mergeCells)?.mergeCell ?? [],
	).flatMap((node) => {
		const ref = attribute(node, "ref");
		if (!ref) return [];
		const [from, to = from] = ref.split(":");
		if (!from || !to) return [];
		const start = splitReference(from);
		const end = splitReference(to);
		return [
			{
				ref,
				startRow: start.row,
				endRow: end.row,
				startColumn: start.column,
				endColumn: end.column,
			},
		];
	});

	return { name: sheetName, rows, merges };
}
