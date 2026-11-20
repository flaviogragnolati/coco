import type { WeeklyClosingSchedule } from "~/shared/common/weekly-closing";

export type OrderCalendarBar = {
	kind: "order" | "closing" | "trip" | "window" | "arrival";
	/** Columns, 1-based, both inclusive. */
	from: number;
	to: number;
};

export type OrderCalendar = {
	days: { label: string; isClosingDay: boolean }[];
	rows: { step: 1 | 2 | 3 | 4; bars: OrderCalendarBar[] }[];
};

const DAY_LABELS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"] as const;

/** The closing sits in this column, after a full week of ordering. */
const CLOSING_COLUMN = 7;

/** One order's cycle, one column per day, from the configured schedule. */
export function getOrderCalendar(
	schedule: WeeklyClosingSchedule,
): OrderCalendar {
	const {
		closingWeekday,
		deliveryDaysMin: min,
		deliveryDaysMax: max,
	} = schedule;
	const firstWeekday = closingWeekday - (CLOSING_COLUMN - 1);

	const days = Array.from({ length: CLOSING_COLUMN + max }, (_, index) => {
		const weekday = (((firstWeekday + index) % 7) + 7) % 7;
		return {
			label: DAY_LABELS[weekday] ?? "",
			isClosingDay: weekday === closingWeekday,
		};
	});

	const earliest = CLOSING_COLUMN + min;
	const latest = CLOSING_COLUMN + max;
	const trip: OrderCalendarBar[] = [
		{ kind: "trip", from: CLOSING_COLUMN + 1, to: earliest },
	];
	if (latest > earliest) {
		trip.push({ kind: "window", from: earliest + 1, to: latest });
	}

	return {
		days,
		rows: [
			{ step: 1, bars: [{ kind: "order", from: 1, to: CLOSING_COLUMN }] },
			{
				step: 2,
				bars: [{ kind: "closing", from: CLOSING_COLUMN, to: CLOSING_COLUMN }],
			},
			{ step: 3, bars: trip },
			{ step: 4, bars: [{ kind: "arrival", from: earliest, to: latest }] },
		],
	};
}
