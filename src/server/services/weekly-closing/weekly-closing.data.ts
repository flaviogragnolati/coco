import "server-only";

import type { Prisma } from "~/prisma/client";
import type { db } from "~/server/db";

export const weeklyClosingScheduleSelect = {
	closingWeekday: true,
	closingHour: true,
	closingMinute: true,
	deliveryDaysMin: true,
	deliveryDaysMax: true,
} satisfies Prisma.WeeklyClosingSettingsSelect;

/** Public read: never creates the row, `null` means "not configured yet". */
export async function findWeeklyClosingSettings(database: typeof db) {
	return database.weeklyClosingSettings.findUnique({
		where: { id: 1 },
		select: weeklyClosingScheduleSelect,
	});
}
