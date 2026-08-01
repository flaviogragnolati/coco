import {
	orderDeclareReceiptInputSchema,
	orderDetailSchema,
	orderGetInputSchema,
	orderListOutputSchema,
} from "~/schemas/checkout.schemas";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as checkoutService from "~/server/services/checkout/checkout.service";

export const ordersRouter = createTRPCRouter({
	listMine: protectedProcedure
		.output(orderListOutputSchema)
		.query(({ ctx }) => {
			return checkoutService.listMine(ctx.session.user.id);
		}),

	getMine: protectedProcedure
		.input(orderGetInputSchema)
		.output(orderDetailSchema)
		.query(({ ctx, input }) => {
			return checkoutService.getMine(ctx.session.user.id, input.id);
		}),

	declareExternalReceipt: protectedProcedure
		.input(orderDeclareReceiptInputSchema)
		.output(orderDetailSchema)
		.mutation(({ ctx, input }) => {
			return checkoutService.declareExternalReceipt(ctx.session.user.id, input);
		}),
});
