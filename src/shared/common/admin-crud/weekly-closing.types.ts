import type { z } from "zod";

import type {
	weeklyClosingSettingsSchema,
	weeklyClosingSettingsUpdateInputSchema,
} from "~/schemas/admin/weekly-closing.schemas";

export type WeeklyClosingSettings = z.output<
	typeof weeklyClosingSettingsSchema
>;
export type WeeklyClosingSettingsUpdateInput = z.output<
	typeof weeklyClosingSettingsUpdateInputSchema
>;
