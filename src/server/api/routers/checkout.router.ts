import {
	checkoutAddressCreateInputSchema,
	checkoutAddressSchema,
	checkoutAddressUpdateInputSchema,
	checkoutConfirmInputSchema,
	checkoutPaymentMethodCreateInputSchema,
	checkoutPaymentMethodSchema,
	checkoutPaymentMethodUpdateInputSchema,
	checkoutPaymentResultSchema,
	checkoutStateSchema,
} from "~/schemas/checkout.schemas";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as checkoutService from "~/server/services/checkout/checkout.service";

export const checkoutRouter = createTRPCRouter({
	start: protectedProcedure.output(checkoutStateSchema).mutation(({ ctx }) => {
		return checkoutService.start(ctx.session.user.id);
	}),

	getState: protectedProcedure.output(checkoutStateSchema).query(({ ctx }) => {
		return checkoutService.getState(ctx.session.user.id);
	}),

	createAddress: protectedProcedure
		.input(checkoutAddressCreateInputSchema)
		.output(checkoutAddressSchema)
		.mutation(({ ctx, input }) => {
			return checkoutService.createAddress(ctx.session.user.id, input);
		}),

	updateAddress: protectedProcedure
		.input(checkoutAddressUpdateInputSchema)
		.output(checkoutAddressSchema)
		.mutation(({ ctx, input }) => {
			return checkoutService.updateAddress(ctx.session.user.id, input);
		}),

	createPaymentMethod: protectedProcedure
		.input(checkoutPaymentMethodCreateInputSchema)
		.output(checkoutPaymentMethodSchema)
		.mutation(({ ctx, input }) => {
			return checkoutService.createPaymentMethod(ctx.session.user.id, input);
		}),

	updatePaymentMethod: protectedProcedure
		.input(checkoutPaymentMethodUpdateInputSchema)
		.output(checkoutPaymentMethodSchema)
		.mutation(({ ctx, input }) => {
			return checkoutService.updatePaymentMethod(ctx.session.user.id, input);
		}),

	confirmAndPay: protectedProcedure
		.input(checkoutConfirmInputSchema)
		.output(checkoutPaymentResultSchema)
		.mutation(({ ctx, input }) => {
			return checkoutService.confirmAndPay(ctx.session.user.id, input);
		}),
});
