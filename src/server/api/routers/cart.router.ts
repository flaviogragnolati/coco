import {
	cartAddComboInputSchema,
	cartAddItemsOutputSchema,
	cartMutationOutputSchema,
	cartRemoveItemInputSchema,
	cartSetItemQuantityInputSchema,
	cartSnapshotSchema,
	cartSyncInputSchema,
} from "~/schemas/cart.schemas";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import * as cartService from "~/server/services/cart/cart.service";
import * as comboCartService from "~/server/services/cart/combo-cart.service";

export const cartRouter = createTRPCRouter({
	getCurrent: protectedProcedure.output(cartSnapshotSchema).query(({ ctx }) => {
		return cartService.getCurrent(ctx.session.user.id);
	}),

	syncLocal: protectedProcedure
		.input(cartSyncInputSchema)
		.output(cartMutationOutputSchema)
		.mutation(({ ctx, input }) => {
			return cartService.syncLocal(ctx.session.user.id, input.items);
		}),

	setItemQuantity: protectedProcedure
		.input(cartSetItemQuantityInputSchema)
		.output(cartMutationOutputSchema)
		.mutation(({ ctx, input }) => {
			return cartService.setItemQuantity(ctx.session.user.id, input);
		}),

	addCombo: protectedProcedure
		.input(cartAddComboInputSchema)
		.output(cartAddItemsOutputSchema)
		.mutation(({ ctx, input }) => {
			return comboCartService.addCombo(ctx.session.user.id, input.comboId);
		}),

	removeItem: protectedProcedure
		.input(cartRemoveItemInputSchema)
		.output(cartMutationOutputSchema)
		.mutation(({ ctx, input }) => {
			return cartService.removeItem(
				ctx.session.user.id,
				input.productClientTermsId,
			);
		}),

	clear: protectedProcedure
		.output(cartMutationOutputSchema)
		.mutation(({ ctx }) => {
			return cartService.clear(ctx.session.user.id);
		}),
});
