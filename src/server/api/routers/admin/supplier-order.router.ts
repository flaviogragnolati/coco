import {
	supplierOrderCancelInputSchema,
	supplierOrderCancelLineInputSchema,
	supplierOrderConfirmInputSchema,
	supplierOrderDetailSchema,
	supplierOrderIdInputSchema,
	supplierOrderListInputSchema,
	supplierOrderListOutputSchema,
	supplierOrderRegisterDispatchInputSchema,
	supplierOrderRequestInputSchema,
	supplierOrderStatsSchema,
} from "~/schemas/admin/supplier-order.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as supplierOrderService from "~/server/services/admin/supplier-order.service";

export const supplierOrderRouter = createTRPCRouter({
	list: adminProcedure
		.input(supplierOrderListInputSchema)
		.output(supplierOrderListOutputSchema)
		.query(async ({ ctx, input }) => supplierOrderService.list(input, ctx.db)),

	getById: adminProcedure
		.input(supplierOrderIdInputSchema)
		.output(supplierOrderDetailSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await supplierOrderService.getById(input.id, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	getStats: adminProcedure
		.output(supplierOrderStatsSchema)
		.query(async ({ ctx }) => supplierOrderService.getStats(ctx.db)),

	request: adminProcedure
		.input(supplierOrderRequestInputSchema)
		.output(supplierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await supplierOrderService.request(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	confirm: adminProcedure
		.input(supplierOrderConfirmInputSchema)
		.output(supplierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await supplierOrderService.confirm(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	cancel: adminProcedure
		.input(supplierOrderCancelInputSchema)
		.output(supplierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await supplierOrderService.cancel(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	cancelLine: adminProcedure
		.input(supplierOrderCancelLineInputSchema)
		.output(supplierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await supplierOrderService.cancelLine(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	/**
	 * The supplier order commands the dispatch (ADR 0003); the shipment and the
	 * inbound package are its outputs, so the detail it returns is the order's.
	 */
	registerDispatch: adminProcedure
		.input(supplierOrderRegisterDispatchInputSchema)
		.output(supplierOrderDetailSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await supplierOrderService.registerDispatch(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
