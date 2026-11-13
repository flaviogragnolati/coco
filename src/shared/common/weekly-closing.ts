import dayjs from "dayjs";
import { BUSINESS_TZ, getNextClosing } from "./date.helpers";

export type WeeklyClosingSchedule = {
	/** 0 = domingo … 6 = sábado, the `Date#getDay` convention. */
	closingWeekday: number;
	/** Argentina time (`BUSINESS_TZ`). */
	closingHour: number;
	closingMinute: number;
	deliveryDaysMin: number;
	deliveryDaysMax: number;
};

/** What the storefront tells customers while no admin has saved a schedule. */
export const DEFAULT_WEEKLY_CLOSING: WeeklyClosingSchedule = {
	closingWeekday: 3,
	closingHour: 12,
	closingMinute: 0,
	deliveryDaysMin: 7,
	deliveryDaysMax: 10,
};

const WEEKDAY_NAMES = [
	"domingo",
	"lunes",
	"martes",
	"miércoles",
	"jueves",
	"viernes",
	"sábado",
] as const;

/** Monday first, the order the admin picker shows. */
export const WEEKDAYS_FROM_MONDAY = [1, 2, 3, 4, 5, 6, 0] as const;

export function weekdayName(weekday: number) {
	return WEEKDAY_NAMES[weekday] ?? "";
}

/** "los miércoles", "los sábados": only the weekend names take an s. */
export function weekdayPlural(weekday: number) {
	const name = weekdayName(weekday);
	return weekday === 0 || weekday === 6 ? `${name}s` : name;
}

function pad2(value: number) {
	return String(value).padStart(2, "0");
}

/** "12", "18:30", "9". */
export function formatClosingClock(hour: number, minute: number) {
	return minute === 0 ? String(hour) : `${hour}:${pad2(minute)}`;
}

/** "a las 12", "a las 18:30", and "a la 1" for the one singular hour. */
function atClock(hour: number, minute: number) {
	return `${hour === 1 ? "a la" : "a las"} ${formatClosingClock(hour, minute)}`;
}

/** "a las 12": the configured closing time of day. */
export function formatClosingTime(schedule: WeeklyClosingSchedule) {
	return atClock(schedule.closingHour, schedule.closingMinute);
}

/** "miércoles a las 12": the configured weekly slot, without a date. */
export function formatClosingSlot(schedule: WeeklyClosingSchedule) {
	return `${weekdayName(schedule.closingWeekday)} ${formatClosingTime(schedule)}`;
}

/** "miércoles 18/11 a las 12", read in Argentina time. */
export function formatClosingDate(date: Date) {
	const local = dayjs(date).tz(BUSINESS_TZ);
	return `${weekdayName(local.day())} ${local.format("DD/MM")} ${atClock(
		local.hour(),
		local.minute(),
	)}`;
}

function days(count: number) {
	return count === 1 ? "1 día" : `${count} días`;
}

/** "7 a 10 días", or "7 días" when the range collapses. */
export function formatDeliveryLeadTime(schedule: WeeklyClosingSchedule) {
	const { deliveryDaysMin: min, deliveryDaysMax: max } = schedule;
	return min === max ? days(min) : `${min} a ${max} días`;
}

/** "entre 7 y 10 días", or "7 días" when the range collapses. */
export function formatDeliveryLeadTimeBetween(schedule: WeeklyClosingSchedule) {
	const { deliveryDaysMin: min, deliveryDaysMax: max } = schedule;
	return min === max ? days(min) : `entre ${min} y ${max} días`;
}

function remaining(count: number, rest: string) {
	return `${count === 1 ? "falta" : "faltan"} ${count} ${rest}`;
}

/**
 * The part after "Cierre del pedido: ". Whole minutes only, rounded down, so the
 * text changes once a minute and never shows seconds.
 */
export function formatTimeUntilClosing(now: Date, closing: Date) {
	const totalMinutes = Math.floor((closing.getTime() - now.getTime()) / 60_000);
	if (totalMinutes < 1) return "falta menos de 1 min";

	const dayCount = Math.floor(totalMinutes / (24 * 60));
	const hourCount = Math.floor((totalMinutes % (24 * 60)) / 60);
	const minuteCount = totalMinutes % 60;

	if (dayCount > 0) {
		const base = remaining(dayCount, dayCount === 1 ? "día" : "días");
		return hourCount > 0 ? `${base} y ${hourCount} h` : base;
	}
	if (hourCount > 0) {
		const base = remaining(hourCount, "h");
		return minuteCount > 0 ? `${base} ${minuteCount} min` : base;
	}
	return remaining(minuteCount, "min");
}

/** "Los pedidos cierran los miércoles al mediodía y llegan en 7 a 10 días." */
export function heroClosingLine(schedule: WeeklyClosingSchedule) {
	const { closingHour, closingMinute } = schedule;
	const time =
		closingHour === 12 && closingMinute === 0
			? "al mediodía"
			: atClock(closingHour, closingMinute);
	return `Los pedidos cierran los ${weekdayPlural(
		schedule.closingWeekday,
	)} ${time} y llegan en ${formatDeliveryLeadTime(schedule)}.`;
}

/** "Entra en el cierre del miércoles 18/11 a las 12 · Llega en 7 a 10 días". */
export function productClosingLine(now: Date, schedule: WeeklyClosingSchedule) {
	return `Entra en el cierre del ${formatClosingDate(
		getNextClosing(now, schedule),
	)} · Llega en ${formatDeliveryLeadTime(schedule)}`;
}
