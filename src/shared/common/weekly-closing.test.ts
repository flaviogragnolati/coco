import { describe, expect, it } from "vitest";

import { weeklyClosingScheduleSchema } from "~/schemas/weekly-closing.schemas";
import { getNextClosing } from "./date.helpers";
import {
	DEFAULT_WEEKLY_CLOSING,
	formatClosingDate,
	formatClosingSlot,
	formatDeliveryLeadTime,
	formatTimeUntilClosing,
	heroClosingLine,
	productClosingLine,
	splitTimeUntilClosing,
	weekdayName,
	weekdayPlural,
} from "./weekly-closing";

const closing = new Date("2026-11-18T15:00:00.000Z");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function before(ms: number) {
	return new Date(closing.getTime() - ms);
}

const saturdayEvening = {
	...DEFAULT_WEEKLY_CLOSING,
	closingWeekday: 6,
	closingHour: 18,
	closingMinute: 30,
	deliveryDaysMin: 7,
	deliveryDaysMax: 7,
};

describe("formatTimeUntilClosing", () => {
	const cases: Array<[remaining: number, text: string]> = [
		[4 * DAY + 21 * HOUR + 59 * MINUTE, "faltan 4 días y 21 h"],
		[DAY + 3 * HOUR, "falta 1 día y 3 h"],
		[2 * DAY, "faltan 2 días"],
		[DAY + 30 * MINUTE, "falta 1 día"],
		[5 * HOUR + 20 * MINUTE, "faltan 5 h 20 min"],
		[5 * HOUR, "faltan 5 h"],
		[HOUR + 5 * MINUTE, "falta 1 h 5 min"],
		[40 * MINUTE + 59_000, "faltan 40 min"],
		[MINUTE, "falta 1 min"],
		[30_000, "falta menos de 1 min"],
		[0, "falta menos de 1 min"],
		[-MINUTE, "falta menos de 1 min"],
	];

	it.each(cases)("%i ms before → %s", (remaining, text) => {
		expect(formatTimeUntilClosing(before(remaining), closing)).toBe(text);
	});
});

describe("splitTimeUntilClosing", () => {
	const split = (remaining: number) =>
		splitTimeUntilClosing(before(remaining), closing);

	it("splits the whole minutes left, rounded down", () => {
		expect(split(4 * DAY + 21 * HOUR + 11 * MINUTE + 59_000)).toEqual({
			days: 4,
			hours: 21,
			minutes: 11,
		});
		expect(split(HOUR + 5 * MINUTE)).toEqual({ days: 0, hours: 1, minutes: 5 });
	});

	it("stops at zero once the closing has passed", () => {
		const zero = { days: 0, hours: 0, minutes: 0 };
		expect(split(30_000)).toEqual(zero);
		expect(split(-MINUTE)).toEqual(zero);
	});
});

describe("closing copy", () => {
	it("formats a closing instant in Argentina time", () => {
		expect(formatClosingDate(closing)).toBe("miércoles 18/11 a las 12");
		expect(formatClosingDate(new Date("2026-11-21T21:30:00.000Z"))).toBe(
			"sábado 21/11 a las 18:30",
		);
	});

	it("names the weekly slot without a date", () => {
		expect(formatClosingSlot(DEFAULT_WEEKLY_CLOSING)).toBe(
			"miércoles a las 12",
		);
		expect(formatClosingSlot(saturdayEvening)).toBe("sábado a las 18:30");
	});

	it("pluralizes only the weekend names", () => {
		expect(weekdayName(3)).toBe("miércoles");
		expect(weekdayPlural(3)).toBe("miércoles");
		expect(weekdayPlural(6)).toBe("sábados");
		expect(weekdayPlural(0)).toBe("domingos");
	});

	it("collapses an equal delivery range", () => {
		expect(formatDeliveryLeadTime(DEFAULT_WEEKLY_CLOSING)).toBe("7 a 10 días");
		expect(formatDeliveryLeadTime(saturdayEvening)).toBe("7 días");
	});

	it("says noon in the hero only for 12:00", () => {
		expect(heroClosingLine(DEFAULT_WEEKLY_CLOSING)).toBe(
			"Los pedidos cierran los miércoles al mediodía y llegan en 7 a 10 días.",
		);
		expect(heroClosingLine(saturdayEvening)).toBe(
			"Los pedidos cierran los sábados a las 18:30 y llegan en 7 días.",
		);
	});

	it("tells the product detail which closing it joins", () => {
		expect(
			productClosingLine(
				getNextClosing(
					new Date("2026-11-13T18:00:00Z"),
					DEFAULT_WEEKLY_CLOSING,
				),
				DEFAULT_WEEKLY_CLOSING,
			),
		).toBe(
			"Entra en el cierre del miércoles 18/11 a las 12 · Llega en 7 a 10 días",
		);
	});
});

describe("weeklyClosingScheduleSchema", () => {
	it("accepts the defaults", () => {
		expect(weeklyClosingScheduleSchema.parse(DEFAULT_WEEKLY_CLOSING)).toEqual(
			DEFAULT_WEEKLY_CLOSING,
		);
	});

	it.each([
		["a weekday of 7", { closingWeekday: 7 }],
		["hour 24", { closingHour: 24 }],
		["minute 60", { closingMinute: 60 }],
	])("rejects %s", (_label, override) => {
		expect(
			weeklyClosingScheduleSchema.safeParse({
				...DEFAULT_WEEKLY_CLOSING,
				...override,
			}).success,
		).toBe(false);
	});

	it("asks in Spanish for a field left blank", () => {
		const result = weeklyClosingScheduleSchema.safeParse({
			...DEFAULT_WEEKLY_CLOSING,
			closingHour: Number.NaN,
		});

		expect(result.error?.issues[0]?.message).toBe(
			"Completá la hora del cierre",
		);
	});

	it("rejects a maximum below the minimum on the maximum field", () => {
		const result = weeklyClosingScheduleSchema.safeParse({
			...DEFAULT_WEEKLY_CLOSING,
			deliveryDaysMin: 10,
			deliveryDaysMax: 7,
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues[0]).toMatchObject({
			path: ["deliveryDaysMax"],
			message: "El máximo no puede ser menor que el mínimo",
		});
	});
});
