import type { z } from "zod";

import type {
	cartAddedLineSchema,
	cartAddItemInputSchema,
	cartAddItemsOutputSchema,
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
import type {
	repeatOrderInputSchema,
	repeatOrderPreviewLineSchema,
	repeatOrderPreviewSchema,
} from "~/schemas/repeat-order.schemas";

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
export type CartAddItemInput = z.output<typeof cartAddItemInputSchema>;
export type CartAddedLine = z.output<typeof cartAddedLineSchema>;
export type CartAddItemsOutput = z.output<typeof cartAddItemsOutputSchema>;
export type RepeatOrderPreview = z.output<typeof repeatOrderPreviewSchema>;
export type RepeatOrderPreviewLine = z.output<
	typeof repeatOrderPreviewLineSchema
>;
export type RepeatOrderInput = z.output<typeof repeatOrderInputSchema>;
