import { z } from "zod";

import {
	qaTicketClaimInputSchema,
	qaTicketCreateInputSchema,
	qaTicketDeleteInputSchema,
	qaTicketDetailSchema,
	qaTicketListInputSchema,
	qaTicketListOutputSchema,
	qaTicketSetStatusInputSchema,
	qaTicketStatsSchema,
	qaTicketUpdateInputSchema,
} from "~/schemas/admin/qa-ticket.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as qaTicketService from "~/server/services/admin/qa-ticket.service";

const deleteResultSchema = z.object({
	id: qaTicketDeleteInputSchema.shape.id,
});

export const qaTicketRouter = createTRPCRouter({
	list: adminProcedure
		.input(qaTicketListInputSchema)
		.output(qaTicketListOutputSchema)
		.query(async ({ ctx, input }) => qaTicketService.list(input, ctx.db)),

	getById: adminProcedure
		.input(qaTicketDeleteInputSchema)
		.output(qaTicketDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await qaTicketService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(qaTicketStatsSchema)
		.query(async ({ ctx }) => qaTicketService.getStats(ctx.db)),

	create: adminProcedure
		.input(qaTicketCreateInputSchema)
		.output(qaTicketDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await qaTicketService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(qaTicketUpdateInputSchema)
		.output(qaTicketDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await qaTicketService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	setStatus: adminProcedure
		.input(qaTicketSetStatusInputSchema)
		.output(qaTicketDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await qaTicketService.setStatus(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	claim: adminProcedure
		.input(qaTicketClaimInputSchema)
		.output(qaTicketDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await qaTicketService.claim(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(qaTicketDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await qaTicketService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(qaTicketDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await qaTicketService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
