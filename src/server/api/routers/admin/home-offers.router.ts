import {
	homeOfferCandidateListOutputSchema,
	homeOfferPinSchema,
	homeOfferSetPinnedRankInputSchema,
	homeOfferSetSpotlightInputSchema,
	homeOfferSettingsSchema,
	homeOfferSettingsUpdateInputSchema,
} from "~/schemas/admin/home-offers.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as homeOffersService from "~/server/services/admin/home-offers.service";

// Curating the home is merchandising, not language or payment governance, so
// every procedure here stops at `adminProcedure`.
export const homeOffersRouter = createTRPCRouter({
	getSettings: adminProcedure
		.output(homeOfferSettingsSchema)
		.query(async ({ ctx }) => homeOffersService.getSettings(ctx.db)),

	listCandidates: adminProcedure
		.output(homeOfferCandidateListOutputSchema)
		.query(async ({ ctx }) => homeOffersService.listCandidates(ctx.db)),

	updateSettings: adminProcedure
		.input(homeOfferSettingsUpdateInputSchema)
		.output(homeOfferSettingsSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await homeOffersService.updateSettings(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	setSpotlight: adminProcedure
		.input(homeOfferSetSpotlightInputSchema)
		.output(homeOfferSettingsSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await homeOffersService.setSpotlight(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	setPinnedRank: adminProcedure
		.input(homeOfferSetPinnedRankInputSchema)
		.output(homeOfferPinSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await homeOffersService.setPinnedRank(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
