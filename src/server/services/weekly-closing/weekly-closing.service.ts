import "server-only";

import { cache } from "react";
import { weeklyClosingScheduleSchema } from "~/schemas/weekly-closing.schemas";
import { db } from "~/server/db";
import { appLogger } from "~/server/services/logging/app-logger.service";
import {
	DEFAULT_WEEKLY_CLOSING,
	type WeeklyClosingSchedule,
} from "~/shared/common/weekly-closing";
import { findWeeklyClosingSettings } from "./weekly-closing.data";

/**
 * One query per request, shared by the storefront layout and the home page.
 * Every storefront page waits on it, so a failed read or an invalid row falls
 * back to the defaults instead of taking the page down: the closing is copy.
 */
export const getWeeklyClosingSchedule = cache(
	async (): Promise<WeeklyClosingSchedule> => {
		try {
			const settings = await findWeeklyClosingSettings(db);
			if (!settings) return DEFAULT_WEEKLY_CLOSING;

			const parsed = weeklyClosingScheduleSchema.safeParse(settings);
			if (parsed.success) return parsed.data;
			appLogger.warn("weeklyClosingSettingsInvalid", {
				issues: parsed.error.issues.map((issue) => issue.message),
			});
		} catch (error) {
			appLogger.error("weeklyClosingSettingsReadFailed", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
		return DEFAULT_WEEKLY_CLOSING;
	},
);
