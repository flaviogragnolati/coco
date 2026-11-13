import "server-only";

import { cache } from "react";
import { weeklyClosingScheduleSchema } from "~/schemas/weekly-closing.schemas";
import { db } from "~/server/db";
import {
	DEFAULT_WEEKLY_CLOSING,
	type WeeklyClosingSchedule,
} from "~/shared/common/weekly-closing";
import { findWeeklyClosingSettings } from "./weekly-closing.data";

/** One query per request, shared by the storefront layout and the home page. */
export const getWeeklyClosingSchedule = cache(
	async (): Promise<WeeklyClosingSchedule> => {
		const settings = await findWeeklyClosingSettings(db);
		return settings
			? weeklyClosingScheduleSchema.parse(settings)
			: DEFAULT_WEEKLY_CLOSING;
	},
);
