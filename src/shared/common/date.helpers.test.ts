import { describe, expect, test } from "vitest";
import {
	formatDateTimeFull,
	formatDateTimeMedium,
	formatDateTimeShort,
	fromDateTimeLocalValue,
	getNextClosing,
	toDateTimeLocalValue,
} from "./date.helpers";

// Node fixes the process timezone at startup, so these cases pin the helpers to
// explicit UTC instants instead of mutating process.env.TZ mid-run. Independence
// from the host zone is verified by running this file under TZ=UTC and
// TZ=America/Los_Angeles. Buenos Aires is UTC-3 year round (no DST).

test("formats an absolute instant in the business timezone", () => {
	expect(toDateTimeLocalValue(new Date("2026-07-22T14:30:00Z"))).toBe(
		"2026-07-22T11:30",
	);
});

test("parses a naive value as business-timezone local time", () => {
	expect(fromDateTimeLocalValue("2026-07-22T11:30").toISOString()).toBe(
		"2026-07-22T14:30:00.000Z",
	);
});

test("round-trips an instant truncated to the minute", () => {
	const instant = new Date("2026-03-09T08:45:00.000Z");

	expect(
		fromDateTimeLocalValue(toDateTimeLocalValue(instant)).toISOString(),
	).toBe(instant.toISOString());
});

test("passes absolute strings through untouched", () => {
	expect(fromDateTimeLocalValue("2026-07-22T14:30:00.000Z").toISOString()).toBe(
		"2026-07-22T14:30:00.000Z",
	);

	expect(
		fromDateTimeLocalValue("2026-07-22T11:30:00-03:00").toISOString(),
	).toBe("2026-07-22T14:30:00.000Z");
});

test("treats a date-only value as midnight in the business timezone", () => {
	expect(fromDateTimeLocalValue("2026-07-22").toISOString()).toBe(
		"2026-07-22T03:00:00.000Z",
	);
});

// The display formatters are pinned to BUSINESS_TZ, so these expectations are
// absolute: 14:30 UTC is 11:30 in Buenos Aires regardless of the host zone. A
// test that round-tripped through the host zone would pass on a machine set to
// Argentina while the pin was missing -- exactly how the write-side drift
// survived to production.
test("renders the short format in the business timezone", () => {
	expect(formatDateTimeShort(new Date("2026-07-22T14:30:00Z"))).toBe(
		"22/7/26, 11:30 a. m.",
	);
});

test("renders the full format in the business timezone", () => {
	expect(formatDateTimeFull(new Date("2026-07-22T14:30:00Z"))).toBe(
		"miércoles, 22 de julio de 2026, 11:30:00 a. m.",
	);
});

test("renders the medium format in the business timezone", () => {
	expect(formatDateTimeMedium(new Date("2026-07-22T14:30:00Z"))).toBe(
		"22 jul 2026, 11:30 a. m.",
	);
});

test("accepts an ISO string as well as a Date", () => {
	expect(formatDateTimeShort("2026-07-22T14:30:00Z")).toBe(
		formatDateTimeShort(new Date("2026-07-22T14:30:00Z")),
	);
});

describe("getNextClosing", () => {
	const wednesdayNoon = {
		closingWeekday: 3,
		closingHour: 12,
		closingMinute: 0,
	};
	const cases: Array<[label: string, now: string, expected: string]> = [
		[
			"from a Friday afternoon",
			"2026-11-13T18:00:00Z",
			"2026-11-18T15:00:00.000Z",
		],
		[
			"the same Wednesday morning",
			"2026-11-18T14:59:00Z",
			"2026-11-18T15:00:00.000Z",
		],
		[
			"at the exact closing instant",
			"2026-11-18T15:00:00.000Z",
			"2026-11-25T15:00:00.000Z",
		],
		[
			"one second after closing",
			"2026-11-18T15:00:01Z",
			"2026-11-25T15:00:00.000Z",
		],
		[
			"Tuesday 23:30 in Argentina, already Wednesday in UTC",
			"2026-11-18T02:30:00Z",
			"2026-11-18T15:00:00.000Z",
		],
		[
			"Wednesday 21:30 in Argentina, already Thursday in UTC",
			"2026-11-19T00:30:00Z",
			"2026-11-25T15:00:00.000Z",
		],
		["across the year end", "2026-12-30T16:00:00Z", "2027-01-06T15:00:00.000Z"],
	];

	test.each(cases)("%s", (_label, now, expected) => {
		expect(getNextClosing(new Date(now), wednesdayNoon).toISOString()).toBe(
			expected,
		);
	});

	test("honors another weekday and minute", () => {
		expect(
			getNextClosing(new Date("2026-11-13T18:00:00Z"), {
				closingWeekday: 0,
				closingHour: 18,
				closingMinute: 30,
			}).toISOString(),
		).toBe("2026-11-15T21:30:00.000Z");
	});
});
