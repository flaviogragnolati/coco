import {
	shipmentAddPackagesInputSchema,
	shipmentCreateEndUserInputSchema,
	shipmentDeliverInputSchema,
	shipmentDetailSchema,
	shipmentExceptionInputSchema,
	shipmentGetByIdInputSchema,
	shipmentIdInputSchema,
	shipmentListInputSchema,
	shipmentListOutputSchema,
	shipmentReceiveInputSchema,
	shipmentRetryInputSchema,
	shipmentStatsSchema,
} from "~/schemas/admin/shipment.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as shipmentService from "~/server/services/admin/shipment.service";

export const shipmentRouter = createTRPCRouter({
	list: adminProcedure
		.input(shipmentListInputSchema)
		.output(shipmentListOutputSchema)
		.query(async ({ ctx, input }) => shipmentService.list(input, ctx.db)),

	getById: adminProcedure
		.input(shipmentGetByIdInputSchema)
		.output(shipmentDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await shipmentService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(shipmentStatsSchema)
		.query(async ({ ctx }) => shipmentService.getStats(ctx.db)),

	dispatch: adminProcedure
		.input(shipmentIdInputSchema)
		.output(shipmentDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await shipmentService.dispatch(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	receive: adminProcedure
		.input(shipmentReceiveInputSchema)
		.output(shipmentDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await shipmentService.receive(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	markDelayed: adminProcedure
		.input(shipmentExceptionInputSchema)
		.output(shipmentDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await shipmentService.markDelayed(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	markFailed: adminProcedure
		.input(shipmentExceptionInputSchema)
		.output(shipmentDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await shipmentService.markFailed(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	deliver: adminProcedure
		.input(shipmentDeliverInputSchema)
		.output(shipmentDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await shipmentService.deliver(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	/** The output describes the **new** shipment, not any of the packages claimed. */
	createEndUser: adminProcedure
		.input(shipmentCreateEndUserInputSchema)
		.output(shipmentDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await shipmentService.createEndUser(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	addPackages: adminProcedure
		.input(shipmentAddPackagesInputSchema)
		.output(shipmentDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await shipmentService.addPackages(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	/** The output describes the **new** shipment a retry creates, not the failed one. */
	retry: adminProcedure
		.input(shipmentRetryInputSchema)
		.output(shipmentDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await shipmentService.retry(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
