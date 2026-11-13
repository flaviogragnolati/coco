import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { WeeklyClosingSchedule } from "./weekly-closing";

dayjs.extend(utc);
dayjs.extend(timezone);

// A source constant, not configuration: a per-environment timezone is exactly how
// the drift this module fixes gets reintroduced.
export const BUSINESS_TZ = "America/Argentina/Buenos_Aires";

const DATE_TIME_LOCAL_FORMAT = "YYYY-MM-DDTHH:mm";
const ABSOLUTE_INSTANT = /(?:Z|[+-]\d{2}:?\d{2})$/;

export function toDateTimeLocalValue(value: Date | string) {
	return dayjs(value).tz(BUSINESS_TZ).format(DATE_TIME_LOCAL_FORMAT);
}

export function fromDateTimeLocalValue(value: string) {
	if (ABSOLUTE_INSTANT.test(value)) return new Date(value);

	return dayjs.tz(value, BUSINESS_TZ).toDate();
}

const shortFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeZone: BUSINESS_TZ,
	timeStyle: "short",
});

const fullFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "full",
	timeZone: BUSINESS_TZ,
	timeStyle: "medium",
});

const mediumFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "medium",
	timeZone: BUSINESS_TZ,
	timeStyle: "short",
});

function toDate(value: Date | string) {
	return value instanceof Date ? value : new Date(value);
}

export function formatDateTimeShort(value: Date | string) {
	return shortFormatter.format(toDate(value));
}

export function formatDateTimeFull(value: Date | string) {
	return fullFormatter.format(toDate(value));
}

export function formatDateTimeMedium(value: Date | string) {
	return mediumFormatter.format(toDate(value));
}

export function pad2(value: number) {
	return String(value).padStart(2, "0");
}

/**
 * The first weekly closing strictly after `now`: the exact closing instant
 * already counts as closed. The calendar day comes from Argentina time and the
 * instant is parsed in that zone, so neither the host zone nor a DST change can
 * shift it (chaining `.hour()` onto a `.tz()` object has known offset bugs).
 */
export function getNextClosing(
	now: Date,
	schedule: Pick<
		WeeklyClosingSchedule,
		"closingWeekday" | "closingHour" | "closingMinute"
	>,
) {
	const local = dayjs(now).tz(BUSINESS_TZ);
	const daysAhead = (schedule.closingWeekday - local.day() + 7) % 7;
	const clock = `${pad2(schedule.closingHour)}:${pad2(schedule.closingMinute)}`;
	const at = (offsetDays: number) =>
		dayjs.tz(
			`${local.add(offsetDays, "day").format("YYYY-MM-DD")} ${clock}`,
			BUSINESS_TZ,
		);
	const closing = at(daysAhead);
	return (closing.isAfter(now) ? closing : at(daysAhead + 7)).toDate();
}
