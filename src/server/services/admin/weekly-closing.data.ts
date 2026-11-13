import type { Prisma } from "~/prisma/client";
import type { WeeklyClosingSettingsUpdateInput } from "~/shared/common/admin-crud/weekly-closing.types";

type AdminDbClient = Prisma.TransactionClient;

const WEEKLY_CLOSING_SETTINGS_ID = 1;

const weeklyClosingSettingsSelect = {
	closingWeekday: true,
	closingHour: true,
	closingMinute: true,
	deliveryDaysMin: true,
	deliveryDaysMax: true,
	updatedAt: true,
} satisfies Prisma.WeeklyClosingSettingsSelect;

export type WeeklyClosingSettingsRecord =
	Prisma.WeeklyClosingSettingsGetPayload<{
		select: typeof weeklyClosingSettingsSelect;
	}>;

/**
 * The admin owns the singleton row: every admin read and write goes through the
 * same upsert on `id: 1`, so opening the screen on a fresh database creates it
 * with the schema defaults.
 */
export async function upsertWeeklyClosingSettings(
	db: AdminDbClient,
	data: Partial<WeeklyClosingSettingsUpdateInput> = {},
) {
	return db.weeklyClosingSettings.upsert({
		where: { id: WEEKLY_CLOSING_SETTINGS_ID },
		create: { id: WEEKLY_CLOSING_SETTINGS_ID, ...data },
		update: data,
		select: weeklyClosingSettingsSelect,
	});
}
