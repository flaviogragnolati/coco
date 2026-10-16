import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { XlsxSheet } from "~/server/lib/xlsx/xlsx-reader";
import { launchExpected } from "./fixtures/quintal-launch.expected";
import { quintalLaunchSource } from "./quintal-launch-catalog.config";
import { parseQuintalLaunchSheet } from "./quintal-launch-catalog.parser";

function fixture() {
	return JSON.parse(
		readFileSync(
			new URL("./fixtures/quintal-launch-2026-10.json", import.meta.url),
			"utf8",
		),
	) as { sheet: XlsxSheet; criteriaSheet: XlsxSheet };
}

describe("launch import", () => {
	it("imports all published terms and the caju split, preserving cost criteria internally", () => {
		const { sheet, criteriaSheet } = fixture();
		const result = parseQuintalLaunchSheet(
			sheet,
			criteriaSheet,
			quintalLaunchSource,
		);
		expect(result.issues).toEqual([]);
		expect(
			result.catalog?.products.map((p) => [
				p.name,
				p.unit,
				p.clientTerms.unitPrice,
				p.clientTerms.moq,
				p.supplierTerms.moq,
				p.supplierTerms.moqPrice,
			]),
		).toEqual(launchExpected);
		expect(result.catalog?.importReference?.criteriaRows).toEqual(
			criteriaSheet.rows.map(({ row, cells }) => ({ row, cells })),
		);
	});
	it.each([
		"C",
		"D",
		"E",
		"F",
		"G",
		"I",
		"J",
		"K",
		"Z",
		"AC",
		"AD",
		"AE",
		"AF",
	])("rejects missing required cell %s without producing a partial catalog", (column) => {
		const { sheet, criteriaSheet } = fixture();
		const row = sheet.rows.find((r) => r.row === 8);
		if (!row) throw new Error("fixture");
		delete row.cells[column];
		expect(
			parseQuintalLaunchSheet(sheet, criteriaSheet, quintalLaunchSource)
				.catalog,
		).toBeNull();
	});
	it.each([
		"duplicate",
		"pack-price",
		"minimum-price",
		"unit",
		"category",
		"header",
		"uncached",
		"formula-error",
	])("rejects %s", (defect) => {
		const { sheet, criteriaSheet } = fixture();
		const row = sheet.rows.find((r) => r.row === 8);
		if (!row) throw new Error("fixture");
		if (defect === "duplicate") sheet.rows.push(structuredClone(row));
		if (defect === "pack-price") row.cells.AF = "1";
		if (defect === "minimum-price") row.cells.AC = "1";
		if (defect === "unit") row.cells.F = "litro";
		if (defect === "category") row.cells.D = "Inventada";
		if (defect === "header") sheet.rows = sheet.rows.filter((r) => r.row !== 6);
		if (defect === "uncached") row.uncachedFormulaColumns = ["M"];
		if (defect === "formula-error") row.cells.M = "#DIV/0!";
		expect(
			parseQuintalLaunchSheet(sheet, criteriaSheet, quintalLaunchSource)
				.catalog,
		).toBeNull();
	});
	it("refuses a different source snapshot", () => {
		const { sheet, criteriaSheet } = fixture();
		expect(
			parseQuintalLaunchSheet(sheet, criteriaSheet, {
				...quintalLaunchSource,
				sha256: "a".repeat(64),
			}).catalog,
		).toBeNull();
	});
});
