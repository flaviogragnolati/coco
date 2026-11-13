import {
	weeklyClosingSettingsSchema,
	weeklyClosingSettingsUpdateInputSchema,
} from "~/schemas/admin/weekly-closing.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as weeklyClosingService from "~/server/services/admin/weekly-closing.service";

// Any admin edits it: it is storefront copy, not payment governance.
export const weeklyClosingRouter = createTRPCRouter({
	getSettings: adminProcedure
		.output(weeklyClosingSettingsSchema)
		.query(async ({ ctx }) => {
			try {
				return await weeklyClosingService.getSettings(ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	updateSettings: adminProcedure
		.input(weeklyClosingSettingsUpdateInputSchema)
		.output(weeklyClosingSettingsSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await weeklyClosingService.updateSettings(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
