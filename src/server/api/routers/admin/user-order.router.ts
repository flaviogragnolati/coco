import {
	userOrderDeliveryChangeInputSchema,
	userOrderDeliveryOptionsSchema,
	userOrderDeliverySchema,
	userOrderIdInputSchema,
} from "~/schemas/admin/user-order.schemas";
import { mapServiceError } from "~/server/api/_shared/map-service-error";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { toAdminActor } from "~/server/auth/auth.utils";
import * as userOrderService from "~/server/services/admin/user-order.service";

export const userOrderRouter = createTRPCRouter({
	deliveryOptions: adminProcedure
		.input(userOrderIdInputSchema)
		.output(userOrderDeliveryOptionsSchema)
		.query(async ({ ctx, input }) => {
			try {
				return await userOrderService.deliveryOptions(input.orderId, ctx.db);
			} catch (error) {
				mapServiceError(error);
			}
		}),

	changeDeliveryPreference: adminProcedure
		.input(userOrderDeliveryChangeInputSchema)
		.output(userOrderDeliverySchema)
		.mutation(async ({ ctx, input }) => {
			try {
				return await userOrderService.changeDeliveryPreference(
					input,
					toAdminActor(ctx.session.user),
					ctx.db,
				);
			} catch (error) {
				mapServiceError(error);
			}
		}),
});
