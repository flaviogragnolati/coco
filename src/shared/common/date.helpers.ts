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
