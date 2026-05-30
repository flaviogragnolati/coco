import type { z } from "zod";

import type {
	operationsCartDeleteInputSchema,
	operationsCartDetailSchema,
	operationsCartIdSchema,
	operationsCartItemFulfillmentStatusSchema,
	operationsCartItemIdSchema,
	operationsCartItemInputSchema,
	operationsCartItemStatusSchema,
	operationsCartListInputSchema,
	operationsCartListItemSchema,
	operationsCartQuickStatusInputSchema,
	operationsCartStatsSchema,
	operationsCartStatusSchema,
	operationsCartUpdateInputSchema,
	operationsUserOrderStatusSchema,
	operationsUserTransactionStatusSchema,
} from "~/schemas/admin/operations-cart.schemas";

export type OperationsCartId = z.output<typeof operationsCartIdSchema>;
export type OperationsCartItemId = z.output<typeof operationsCartItemIdSchema>;
export type OperationsCartStatus = z.output<typeof operationsCartStatusSchema>;
export type OperationsCartItemStatus = z.output<
	typeof operationsCartItemStatusSchema
>;
export type OperationsCartItemFulfillmentStatus = z.output<
	typeof operationsCartItemFulfillmentStatusSchema
>;
export type OperationsUserOrderStatus = z.output<
	typeof operationsUserOrderStatusSchema
>;
export type OperationsUserTransactionStatus = z.output<
	typeof operationsUserTransactionStatusSchema
>;
export type OperationsCartListInput = z.output<
	typeof operationsCartListInputSchema
>;
export type OperationsCartListItem = z.output<
	typeof operationsCartListItemSchema
>;
export type OperationsCartDetail = z.output<typeof operationsCartDetailSchema>;
export type OperationsCartStats = z.output<typeof operationsCartStatsSchema>;
export type OperationsCartItemInput = z.output<
	typeof operationsCartItemInputSchema
>;
export type OperationsCartUpdateInput = z.output<
	typeof operationsCartUpdateInputSchema
>;
export type OperationsCartQuickStatusInput = z.output<
	typeof operationsCartQuickStatusInputSchema
>;
export type OperationsCartDeleteInput = z.output<
	typeof operationsCartDeleteInputSchema
>;
export type OperationsCartDeleteResult = Pick<OperationsCartDeleteInput, "id">;
export type OperationsCartFormInput = z.input<
	typeof operationsCartUpdateInputSchema
>;
export type OperationsCartFormValues = z.output<
	typeof operationsCartUpdateInputSchema
>;
