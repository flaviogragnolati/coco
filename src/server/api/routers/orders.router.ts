import { cartAddItemsOutputSchema } from "~/schemas/cart.schemas";
import {
	orderDeclareReceiptInputSchema,
	orderDetailSchema,
	orderGetInputSchema,
	orderListOutputSchema,
	orderPaymentReturnInputSchema,
	orderPaymentReturnSchema,
} from "~/schemas/checkout.schemas";
import {
	repeatOrderInputSchema,
	repeatOrderPreviewInputSchema,
	repeatOrderPreviewSchema,
} from "~/schemas/repeat-order.schemas";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as repeatOrderService from "~/server/services/cart/repeat-order.service";
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

	/** Where a Mercado Pago return page sends the customer (ADR 0015). */
	resolvePaymentReturn: protectedProcedure
		.input(orderPaymentReturnInputSchema)
		.output(orderPaymentReturnSchema)
		.query(({ ctx, input }) => {
			return checkoutService.resolvePaymentReturn(ctx.session.user.id, input);
		}),

	declareExternalReceipt: protectedProcedure
		.input(orderDeclareReceiptInputSchema)
		.output(orderDetailSchema)
		.mutation(({ ctx, input }) => {
			return checkoutService.declareExternalReceipt(ctx.session.user.id, input);
		}),

	repeatPreview: protectedProcedure
		.input(repeatOrderPreviewInputSchema)
		.output(repeatOrderPreviewSchema)
		.query(({ ctx, input }) => {
			return repeatOrderService.previewRepeat(
				ctx.session.user.id,
				input.orderId,
			);
		}),

	repeat: protectedProcedure
		.input(repeatOrderInputSchema)
		.output(cartAddItemsOutputSchema)
		.mutation(({ ctx, input }) => {
			return repeatOrderService.repeat(ctx.session.user.id, input);
		}),
});
