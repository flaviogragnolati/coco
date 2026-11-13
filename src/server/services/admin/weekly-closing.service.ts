import { weeklyClosingSettingsSchema } from "~/schemas/admin/weekly-closing.schemas";
import type { db } from "~/server/db";
import type { WeeklyClosingSettingsUpdateInput } from "~/shared/common/admin-crud/weekly-closing.types";
import type { AdminMutationActor } from "./_base/admin-audit";
import { writeAdminAuditLog } from "./_base/admin-audit";
import {
	upsertWeeklyClosingSettings,
	type WeeklyClosingSettingsRecord,
} from "./weekly-closing.data";

type AdminDb = typeof db;

const WEEKLY_CLOSING_SETTINGS_ENTITY = "weeklyClosingSettings";
const WEEKLY_CLOSING_SETTINGS_ENTITY_ID = "1";

function parseSettings(record: WeeklyClosingSettingsRecord) {
	return weeklyClosingSettingsSchema.parse(record);
}

export async function getSettings(database: AdminDb) {
	return parseSettings(await upsertWeeklyClosingSettings(database));
}

export async function updateSettings(
	input: WeeklyClosingSettingsUpdateInput,
	actor: AdminMutationActor,
	database: AdminDb,
) {
	return database.$transaction(async (tx) => {
		const before = parseSettings(await upsertWeeklyClosingSettings(tx));
		const after = parseSettings(await upsertWeeklyClosingSettings(tx, input));

		await writeAdminAuditLog(tx, {
			action: "weeklyClosingSettings.update",
			actor,
			entityType: WEEKLY_CLOSING_SETTINGS_ENTITY,
			entityId: WEEKLY_CLOSING_SETTINGS_ENTITY_ID,
			before,
			after,
		});

		return after;
	});
}
