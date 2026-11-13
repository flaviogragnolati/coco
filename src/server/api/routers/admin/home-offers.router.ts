import { z } from "zod";

import {
	homeComboCandidateListOutputSchema,
	homeFeaturedAddInputSchema,
	homeFeaturedListOutputSchema,
	homeFeaturedPreviewSchema,
	homeFeaturedRemoveInputSchema,
	homeFeaturedReorderInputSchema,
	homeOfferCandidateListOutputSchema,
	homeOfferSetSpotlightInputSchema,
	homeOfferSettingsSchema,
	homeOfferSettingsUpdateInputSchema,
} from "~/schemas/admin/home-offers.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as homeOffersService from "~/server/services/admin/home-offers.service";

const featuredIdResultSchema = z.object({ id: z.number().int().positive() });

// Curating the home is merchandising, not language or payment governance, so
// every procedure here stops at `adminProcedure`.
export const homeOffersRouter = createTRPCRouter({
	getSettings: adminProcedure
		.output(homeOfferSettingsSchema)
		.query(async ({ ctx }) => homeOffersService.getSettings(ctx.db)),

	listCandidates: adminProcedure
		.output(homeOfferCandidateListOutputSchema)
		.query(async ({ ctx }) => homeOffersService.listCandidates(ctx.db)),

	listComboCandidates: adminProcedure
		.output(homeComboCandidateListOutputSchema)
		.query(async ({ ctx }) => homeOffersService.listComboCandidates(ctx.db)),

	listFeatured: adminProcedure
		.output(homeFeaturedListOutputSchema)
		.query(async ({ ctx }) => homeOffersService.listFeatured(ctx.db)),

	preview: adminProcedure
		.output(homeFeaturedPreviewSchema)
		.query(async () => homeOffersService.preview()),

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

	addFeatured: adminProcedure
		.input(homeFeaturedAddInputSchema)
		.output(featuredIdResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await homeOffersService.addFeatured(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	removeFeatured: adminProcedure
		.input(homeFeaturedRemoveInputSchema)
		.output(featuredIdResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await homeOffersService.removeFeatured(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	reorderFeatured: adminProcedure
		.input(homeFeaturedReorderInputSchema)
		.output(homeFeaturedReorderInputSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await homeOffersService.reorderFeatured(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
