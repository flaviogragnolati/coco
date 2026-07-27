import { z } from "zod";
import {
	operationCancelInputSchema,
	operationDeleteInputSchema,
	operationDetailSchema,
	operationDraftCreateInputSchema,
	operationDraftUpdateInputSchema,
	operationExecuteInputSchema,
	operationGetByIdInputSchema,
	operationIdSchema,
	operationListInputSchema,
	operationListOutputSchema,
	operationRerunInputSchema,
	operationReviewOutputSchema,
	operationStatsSchema,
} from "~/schemas/admin/operation.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as operationService from "~/server/services/admin/operation.service";

export const operationRouter = createTRPCRouter({
	list: adminProcedure
		.input(operationListInputSchema)
		.output(operationListOutputSchema)
		.query(async ({ ctx, input }) => operationService.list(input, ctx.db)),

	getById: adminProcedure
		.input(operationGetByIdInputSchema)
		.output(operationDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await operationService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(operationStatsSchema)
		.query(async ({ ctx }) => operationService.getStats(ctx.db)),

	/**
	 * Creating an operation no longer executes it: it produces a `draft` the admin
	 * reviews and then executes as a separate command. There is deliberately no
	 * one-step procedure — the review is mandatory (ADR 0006).
	 */
	createDraft: adminProcedure
		.input(operationDraftCreateInputSchema)
		.output(operationDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationService.createDraft(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	/** Read-only: recomputes the demand from live data and writes nothing. */
	review: adminProcedure
		.input(operationGetByIdInputSchema)
		.output(operationReviewOutputSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await operationService.review(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	updateDraft: adminProcedure
		.input(operationDraftUpdateInputSchema)
		.output(operationReviewOutputSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationService.updateDraft(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	/** Refuses with CONFLICT if the demand moved since the reviewed fingerprint. */
	execute: adminProcedure
		.input(operationExecuteInputSchema)
		.output(operationDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationService.execute(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	cancel: adminProcedure
		.input(operationCancelInputSchema)
		.output(operationDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationService.cancel(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	/** May return a *different* operation than the one it was called on. */
	rerun: adminProcedure
		.input(operationRerunInputSchema)
		.output(operationDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationService.rerun(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	remove: adminProcedure
		.input(operationDeleteInputSchema)
		.output(z.object({ id: operationIdSchema }))
		.mutation(async ({ ctx, input }) => {
			try {
				return await operationService.remove(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
