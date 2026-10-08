import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { readXlsxSheet, XLSX_MAX_ENTRY_BYTES } from "./xlsx-reader";

const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Otra" sheetId="1" r:id="rId1"/>
<sheet name="Lista WEB" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>`;

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`;

const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3">
<si><t>Producto</t></si>
<si><r><rPr><b/></rPr><t xml:space="preserve">Frutos </t></r><r><t>&amp; semillas</t></r><rPh><t>ignored</t></rPh></si>
<si><t xml:space="preserve">  Sal Rosada   </t></si>
</sst>`;

const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
<row r="7"><c r="B7" t="s"><v>0</v></c></row>
<row r="8"><c r="B8" s="2"/></row>
<row r="9"><c r="B9" t="s"><v>1</v></c><c r="D9"><v>19500.0</v></c><c r="E9"><f>D9*10</f><v>195000</v></c></row>
<row r="10"><c r="B10" t="s"><v>2</v></c><c r="C10" t="str"><f>"x"&amp;"1"</f><v>x1</v></c><c r="H10" t="inlineStr"><is><t>BANANA CHIPS</t></is></c></row>
</sheetData>
<mergeCells count="2"><mergeCell ref="B67:E67"/><mergeCell ref="H10:K10"/></mergeCells>
</worksheet>`;

function workbook(parts: Record<string, string | Uint8Array>) {
	return zipSync(
		Object.fromEntries(
			Object.entries(parts).map(([path, content]) => [
				path,
				typeof content === "string" ? strToU8(content) : content,
			]),
		),
	);
}

const validParts = {
	"xl/workbook.xml": workbookXml,
	"xl/_rels/workbook.xml.rels": relsXml,
	"xl/sharedStrings.xml": sharedStringsXml,
	"xl/worksheets/sheet1.xml": "<worksheet><sheetData/></worksheet>",
	"xl/worksheets/sheet2.xml": sheetXml,
};

describe("readXlsxSheet", () => {
	it("resolves the sheet by name through the workbook relationships", () => {
		const sheet = readXlsxSheet(workbook(validParts), "Lista WEB");

		expect(sheet.name).toBe("Lista WEB");
		expect(sheet.rows.map((row) => row.row)).toEqual([7, 9, 10]);
	});

	it("reads shared, rich-text, inline, formula and numeric cells as text", () => {
		const sheet = readXlsxSheet(workbook(validParts), "Lista WEB");
		const [header, product, other] = sheet.rows;

		expect(header?.cells).toEqual({ B: "Producto" });
		expect(product?.cells).toEqual({
			B: "Frutos & semillas",
			D: "19500.0",
			E: "195000",
		});
		expect(other?.cells).toEqual({
			B: "  Sal Rosada   ",
			C: "x1",
			H: "BANANA CHIPS",
		});
	});

	it("returns merged ranges", () => {
		const sheet = readXlsxSheet(workbook(validParts), "Lista WEB");

		expect(sheet.merges).toEqual([
			{
				ref: "B67:E67",
				startRow: 67,
				endRow: 67,
				startColumn: "B",
				endColumn: "E",
			},
			{
				ref: "H10:K10",
				startRow: 10,
				endRow: 10,
				startColumn: "H",
				endColumn: "K",
			},
		]);
	});

	it("rejects a missing sheet name", () => {
		expect(() => readXlsxSheet(workbook(validParts), "Lista")).toThrow(
			/Sheet "Lista" not found/,
		);
	});

	it("rejects a file that is not a zip", () => {
		expect(() => readXlsxSheet(strToU8("not a workbook"), "Lista WEB")).toThrow(
			/Not a readable .xlsx/,
		);
	});

	it("rejects an entry that expands past the size cap", () => {
		const oversized = new Uint8Array(XLSX_MAX_ENTRY_BYTES + 1);
		const bytes = workbook({
			...validParts,
			"xl/worksheets/sheet2.xml": oversized,
		});

		expect(() => readXlsxSheet(bytes, "Lista WEB")).toThrow(/byte limit/);
	});

	it("refuses XML with a DOCTYPE", () => {
		const bytes = workbook({
			...validParts,
			"xl/sharedStrings.xml": `<!DOCTYPE sst [<!ENTITY a "aaaa">]><sst><si><t>&a;</t></si></sst>`,
		});

		expect(() => readXlsxSheet(bytes, "Lista WEB")).toThrow(/DOCTYPE/);
	});
});
