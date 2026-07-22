import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

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
