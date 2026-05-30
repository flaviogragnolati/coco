import type { z } from "zod";

import type {
	cartItemSchema,
	cartLocalItemInputSchema,
	cartMutationOutputSchema,
	cartProductSummarySchema,
	cartRemoveItemInputSchema,
	cartSetItemQuantityInputSchema,
	cartSnapshotSchema,
	cartStatusSchema,
	cartSyncInputSchema,
	cartTotalSchema,
	cartWarningSchema,
} from "~/schemas/cart.schemas";

export type CartStatus = z.output<typeof cartStatusSchema>;
export type CartProductSummary = z.output<typeof cartProductSummarySchema>;
export type CartItem = z.output<typeof cartItemSchema>;
export type CartTotal = z.output<typeof cartTotalSchema>;
export type CartSnapshot = z.output<typeof cartSnapshotSchema>;
export type CartLocalItemInput = z.output<typeof cartLocalItemInputSchema>;
export type CartSyncInput = z.output<typeof cartSyncInputSchema>;
export type CartSetItemQuantityInput = z.output<
	typeof cartSetItemQuantityInputSchema
>;
export type CartRemoveItemInput = z.output<typeof cartRemoveItemInputSchema>;
export type CartWarning = z.output<typeof cartWarningSchema>;
export type CartMutationOutput = z.output<typeof cartMutationOutputSchema>;
