import {
	packageConfirmDeliveryInputSchema,
	packageDetailSchema,
	packageExceptionInputSchema,
	packageFractionateInputSchema,
	packageFractionateOutputSchema,
	packageGetByIdInputSchema,
	packageListInputSchema,
	packageListOutputSchema,
	packagePromoteInputSchema,
	packageRecoverInputSchema,
	packageSplitInputSchema,
	packageSplitOutputSchema,
	packageStatsSchema,
	packageWriteOffInputSchema,
} from "~/schemas/admin/package.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as packageService from "~/server/services/admin/package.service";

export const packageRouter = createTRPCRouter({
	list: adminProcedure
		.input(packageListInputSchema)
		.output(packageListOutputSchema)
		.query(async ({ ctx, input }) => packageService.list(input, ctx.db)),

	getById: adminProcedure
		.input(packageGetByIdInputSchema)
		.output(packageDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await packageService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(packageStatsSchema)
		.query(async ({ ctx }) => packageService.getStats(ctx.db)),

	writeOff: adminProcedure
		.input(packageWriteOffInputSchema)
		.output(packageDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await packageService.writeOff(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	// `fractionate` and `split` output ids, not a detail: the first has N sources
	// and M outputs, the second changes the source *and* creates siblings.
	fractionate: adminProcedure
		.input(packageFractionateInputSchema)
		.output(packageFractionateOutputSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await packageService.fractionate(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	promote: adminProcedure
		.input(packagePromoteInputSchema)
		.output(packageDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await packageService.promote(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	split: adminProcedure
		.input(packageSplitInputSchema)
		.output(packageSplitOutputSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await packageService.split(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	markDelayed: adminProcedure
		.input(packageExceptionInputSchema)
		.output(packageDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await packageService.markDelayed(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	markFailed: adminProcedure
		.input(packageExceptionInputSchema)
		.output(packageDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await packageService.markFailed(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	confirmDelivery: adminProcedure
		.input(packageConfirmDeliveryInputSchema)
		.output(packageDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await packageService.confirmDelivery(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	recover: adminProcedure
		.input(packageRecoverInputSchema)
		.output(packageDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await packageService.recover(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
