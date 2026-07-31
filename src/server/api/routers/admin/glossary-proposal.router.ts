import {
	glossaryProposalCreateInputSchema,
	glossaryProposalListInputSchema,
	glossaryProposalListItemSchema,
	glossaryProposalListOutputSchema,
	glossaryProposalResolveInputSchema,
} from "~/schemas/admin/glossary-proposal.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import {
	adminProcedure,
	createTRPCRouter,
	superadminProcedure,
} from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as glossaryProposalService from "~/server/services/admin/glossary-proposal.service";

export const glossaryProposalRouter = createTRPCRouter({
	list: adminProcedure
		.input(glossaryProposalListInputSchema)
		.output(glossaryProposalListOutputSchema)
		.query(async ({ ctx, input }) =>
			glossaryProposalService.list(input, ctx.db),
		),

	create: adminProcedure
		.input(glossaryProposalCreateInputSchema)
		.output(glossaryProposalListItemSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await glossaryProposalService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	// Deciding the language is a superadmin call, like the payment provider
	// config: any admin may ask, only a superadmin closes the question.
	resolve: superadminProcedure
		.input(glossaryProposalResolveInputSchema)
		.output(glossaryProposalListItemSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await glossaryProposalService.resolve(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
