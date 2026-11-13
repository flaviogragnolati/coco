import { z } from "zod";

import {
	weeklyClosingScheduleObjectSchema,
	weeklyClosingScheduleSchema,
} from "~/schemas/weekly-closing.schemas";

export const weeklyClosingSettingsSchema =
	weeklyClosingScheduleObjectSchema.extend({
		updatedAt: z.date(),
	});

export const weeklyClosingSettingsUpdateInputSchema =
	weeklyClosingScheduleSchema;
