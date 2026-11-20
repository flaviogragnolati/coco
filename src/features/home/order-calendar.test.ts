import { describe, expect, it } from "vitest";

import { DEFAULT_WEEKLY_CLOSING } from "~/shared/common/weekly-closing";
import { getOrderCalendar } from "./order-calendar";

describe("getOrderCalendar", () => {
	const calendar = getOrderCalendar(DEFAULT_WEEKLY_CLOSING);

	it("spans the six days before the closing, the closing and the longest trip", () => {
		expect(calendar.days).toHaveLength(17);
		expect(calendar.days.map((day) => day.label).join(" ")).toBe(
			"Ju Vi Sá Do Lu Ma Mi Ju Vi Sá Do Lu Ma Mi Ju Vi Sá",
		);
	});

	it("marks every column that falls on the closing weekday", () => {
		const closingColumns = calendar.days.flatMap((day, index) =>
			day.isClosingDay ? [index + 1] : [],
		);
		expect(closingColumns).toEqual([7, 14]);
	});

	it("places one row per step", () => {
		expect(calendar.rows).toEqual([
			{ step: 1, bars: [{ kind: "order", from: 1, to: 7 }] },
			{ step: 2, bars: [{ kind: "closing", from: 7, to: 7 }] },
			{
				step: 3,
				bars: [
					{ kind: "trip", from: 8, to: 14 },
					{ kind: "window", from: 15, to: 17 },
				],
			},
			{ step: 4, bars: [{ kind: "arrival", from: 14, to: 17 }] },
		]);
	});

	it("has no arrival window when the lead time is a single number", () => {
		const fixed = getOrderCalendar({
			...DEFAULT_WEEKLY_CLOSING,
			deliveryDaysMin: 5,
			deliveryDaysMax: 5,
		});
		expect(fixed.days).toHaveLength(12);
		expect(fixed.rows[2]?.bars).toEqual([{ kind: "trip", from: 8, to: 12 }]);
		expect(fixed.rows[3]?.bars).toEqual([
			{ kind: "arrival", from: 12, to: 12 },
		]);
	});

	it("follows another closing weekday", () => {
		const saturday = getOrderCalendar({
			...DEFAULT_WEEKLY_CLOSING,
			closingWeekday: 6,
		});
		expect(saturday.days.slice(0, 7).map((day) => day.label)).toEqual([
			"Do",
			"Lu",
			"Ma",
			"Mi",
			"Ju",
			"Vi",
			"Sá",
		]);
		expect(saturday.days[6]?.isClosingDay).toBe(true);
		expect(saturday.days[0]?.isClosingDay).toBe(false);
	});

	it("keeps every bar inside the columns", () => {
		const longest = getOrderCalendar({
			...DEFAULT_WEEKLY_CLOSING,
			deliveryDaysMin: 1,
			deliveryDaysMax: 60,
		});
		expect(longest.days).toHaveLength(67);
		for (const { bars } of longest.rows) {
			for (const bar of bars) {
				expect(bar.from).toBeGreaterThanOrEqual(1);
				expect(bar.to).toBeLessThanOrEqual(67);
				expect(bar.from).toBeLessThanOrEqual(bar.to);
			}
		}
	});
});
