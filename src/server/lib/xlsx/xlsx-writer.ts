import { strToU8, zipSync } from "fflate";

/**
 * Minimal `.xlsx` writer: one worksheet of string and number cells, strings
 * inline (no shared-strings part), optionally with a bold, frozen header row.
 */

export type XlsxWriteCell = string | number | null;

export type XlsxWriteInput = {
	sheetName: string;
	rows: XlsxWriteCell[][];
	/** Bolds and freezes the first row. */
	headerRow?: boolean;
	/** Column widths in characters, by position. */
	columnWidths?: number[];
};

const SHEET_NAME_FORBIDDEN = /[[\]:*?/\\]/;

// XML 1.0 rejects most C0 controls; Excel refuses the whole file over one.
// biome-ignore lint/suspicious/noControlCharactersInRegex: the controls are the target
const XML_INVALID_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g;

function escapeXml(value: string) {
	return value
		.replace(XML_INVALID_CHARACTERS, "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function xlsxColumnLetter(index: number) {
	let letters = "";
	let remaining = index + 1;
	while (remaining > 0) {
		const offset = (remaining - 1) % 26;
		letters = String.fromCharCode(65 + offset) + letters;
		remaining = Math.floor((remaining - 1) / 26);
	}
	return letters;
}

function cellXml(value: XlsxWriteCell, reference: string, style: string) {
	if (value === null || value === "") return "";
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error(`Cell ${reference} is not a finite number`);
		}
		return `<c r="${reference}"${style}><v>${value}</v></c>`;
	}
	return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function worksheetXml(input: XlsxWriteInput) {
	const header = input.headerRow === true;
	const sheetViews = header
		? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
		: "";
	const cols =
		input.columnWidths && input.columnWidths.length > 0
			? `<cols>${input.columnWidths
					.map(
						(width, index) =>
							`<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
					)
					.join("")}</cols>`
			: "";
	const rows = input.rows
		.map((cells, rowIndex) => {
			const rowNumber = rowIndex + 1;
			const style = header && rowIndex === 0 ? ` s="1"` : "";
			const content = cells
				.map((value, columnIndex) =>
					cellXml(value, `${xlsxColumnLetter(columnIndex)}${rowNumber}`, style),
				)
				.join("");
			return `<row r="${rowNumber}">${content}</row>`;
		})
		.join("");

	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${sheetViews}${cols}<sheetData>${rows}</sheetData></worksheet>`;
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function workbookXml(sheetName: string) {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

export function writeXlsxSheet(input: XlsxWriteInput): Uint8Array {
	const name = input.sheetName;
	if (
		name.length === 0 ||
		name.length > 31 ||
		SHEET_NAME_FORBIDDEN.test(name)
	) {
		throw new Error(`Invalid sheet name "${name}"`);
	}

	return zipSync({
		"[Content_Types].xml": strToU8(CONTENT_TYPES_XML),
		"_rels/.rels": strToU8(ROOT_RELS_XML),
		"xl/workbook.xml": strToU8(workbookXml(name)),
		"xl/_rels/workbook.xml.rels": strToU8(WORKBOOK_RELS_XML),
		"xl/styles.xml": strToU8(STYLES_XML),
		"xl/worksheets/sheet1.xml": strToU8(worksheetXml(input)),
	});
}
