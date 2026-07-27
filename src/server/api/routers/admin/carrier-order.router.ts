import { z } from "zod";

import {
	carrierOrderAddShipmentsInputSchema,
	carrierOrderCommandInputSchema,
	carrierOrderCreateInputSchema,
	carrierOrderDeleteInputSchema,
	carrierOrderDetailSchema,
	carrierOrderIdInputSchema,
	carrierOrderListInputSchema,
	carrierOrderListOutputSchema,
	carrierOrderReasonInputSchema,
	carrierOrderRemoveShipmentInputSchema,
	carrierOrderStatsSchema,
	carrierOrderUpdateInputSchema,
} from "~/schemas/admin/carrier-order.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as carrierOrderService from "~/server/services/admin/carrier-order.service";

const deleteResultSchema = z.object({
	id: carrierOrderDeleteInputSchema.shape.id,
});

export const carrierOrderRouter = createTRPCRouter({
	list: adminProcedure
		.input(carrierOrderListInputSchema)
		.output(carrierOrderListOutputSchema)
		.query(async ({ ctx, input }) => carrierOrderService.list(input, ctx.db)),

	getById: adminProcedure
		.input(carrierOrderIdInputSchema)
		.output(carrierOrderDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(carrierOrderStatsSchema)
		.query(async ({ ctx }) => carrierOrderService.getStats(ctx.db)),

	create: adminProcedure
		.input(carrierOrderCreateInputSchema)
		.output(carrierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.create(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	update: adminProcedure
		.input(carrierOrderUpdateInputSchema)
		.output(carrierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.update(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	softDelete: adminProcedure
		.input(carrierOrderDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.softDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	hardDelete: adminProcedure
		.input(carrierOrderDeleteInputSchema)
		.output(deleteResultSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.hardDelete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	request: adminProcedure
		.input(carrierOrderCommandInputSchema)
		.output(carrierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.request(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	confirm: adminProcedure
		.input(carrierOrderCommandInputSchema)
		.output(carrierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.confirm(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	markInTransit: adminProcedure
		.input(carrierOrderCommandInputSchema)
		.output(carrierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.markInTransit(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	complete: adminProcedure
		.input(carrierOrderCommandInputSchema)
		.output(carrierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.complete(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	cancel: adminProcedure
		.input(carrierOrderReasonInputSchema)
		.output(carrierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.cancel(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	markFailed: adminProcedure
		.input(carrierOrderReasonInputSchema)
		.output(carrierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.markFailed(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	addShipments: adminProcedure
		.input(carrierOrderAddShipmentsInputSchema)
		.output(carrierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.addShipments(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	removeShipment: adminProcedure
		.input(carrierOrderRemoveShipmentInputSchema)
		.output(carrierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await carrierOrderService.removeShipment(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
