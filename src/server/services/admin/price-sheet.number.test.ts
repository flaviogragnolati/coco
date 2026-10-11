import { describe, expect, it } from "vitest";

import {
	centsToDecimalString,
	decimalStringToCents,
	PRICE_SHEET_MAX_CENTS,
	parsePriceCell,
} from "./price-sheet.number";

const text = (value: string) => parsePriceCell({ text: value, numeric: false });
const number = (value: string) =>
	parsePriceCell({ text: value, numeric: true });

describe("parsePriceCell (text)", () => {
	it.each([
		["19500", 1_950_000],
		["19500.5", 1_950_050],
		["19500,5", 1_950_050],
		["19500,50", 1_950_050],
		["19.500,50", 1_950_050],
		["19.500", 1_950_000],
		["1.234.567", 123_456_700],
		["1.234.567,89", 123_456_789],
		["1,234.56", 123_456],
		["1,234,567", 123_456_700],
		["0,5", 50],
		["0.5", 50],
		[",5", 50],
		["12.3", 1_230],
		["$ 19.500", 1_950_000],
		["ARS 19.500,5", 1_950_050],
		[" 19 500 ", 1_950_000],
		["-150", -15_000],
	])("reads %j as %i cents", (value, cents) => {
		expect(text(value)).toEqual({ ok: true, cents });
	});

	it.each([
		["19,500"],
		["19,555"],
		["12.3456"],
		["0.500"],
		["1.234,567"],
	])("refuses %j for having more than two decimals", (value) => {
		expect(text(value)).toEqual({ ok: false, reason: "decimals" });
	});

	it.each([
		[""],
		["abc"],
		["12a"],
		["1.000.5"],
		["12.34.567,8"],
		["1234,56.7"],
		["1,2,3"],
		["1e3"],
		["--5"],
	])("refuses %j as not a number", (value) => {
		expect(text(value)).toEqual({ ok: false, reason: "invalid" });
	});

	it("refuses a price above the ceiling", () => {
		expect(text("1.000.000.000")).toEqual({ ok: false, reason: "range" });
		expect(text("999.999.999,99")).toEqual({
			ok: true,
			cents: PRICE_SHEET_MAX_CENTS,
		});
	});
});

describe("parsePriceCell (number cell)", () => {
	it.each([
		["19500", 1_950_000],
		["19500.5", 1_950_050],
		["21450.000000000004", 2_145_000],
		["1.005", 101],
		["19.125", 1_913],
		["1E+3", 100_000],
		["-5", -500],
	])("reads %j as %i cents", (value, cents) => {
		expect(number(value)).toEqual({ ok: true, cents });
	});

	it("never reads a dot in a number cell as a thousands separator", () => {
		expect(number("19.500")).toEqual({ ok: true, cents: 1_950 });
	});

	it("refuses text and out-of-range values", () => {
		expect(number("abc")).toEqual({ ok: false, reason: "invalid" });
		expect(number(" ")).toEqual({ ok: false, reason: "invalid" });
		expect(number("1e12")).toEqual({ ok: false, reason: "range" });
	});
});

describe("cents helpers", () => {
	it("formats cents as a two-decimal string", () => {
		expect(centsToDecimalString(1_950_050)).toBe("19500.50");
		expect(centsToDecimalString(5)).toBe("0.05");
		expect(centsToDecimalString(-150)).toBe("-1.50");
	});

	it("reads stored decimals back as cents", () => {
		expect(decimalStringToCents("19500.5")).toBe(1_950_050);
		expect(decimalStringToCents("19500.50")).toBe(1_950_050);
		expect(decimalStringToCents("19500")).toBe(1_950_000);
		expect(decimalStringToCents("19500.5000")).toBe(1_950_050);
		expect(decimalStringToCents("19500.505")).toBeNull();
		expect(decimalStringToCents("x")).toBeNull();
	});
});
