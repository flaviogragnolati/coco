import type { z } from "zod";

import type {
	supplierOrderAvailableActionSchema,
	supplierOrderCancelInputSchema,
	supplierOrderCancelLineInputSchema,
	supplierOrderCommandKeySchema,
	supplierOrderConfirmInputSchema,
	supplierOrderDetailSchema,
	supplierOrderIdInputSchema,
	supplierOrderListInputSchema,
	supplierOrderListItemSchema,
	supplierOrderListOutputSchema,
	supplierOrderRegisterDispatchInputSchema,
	supplierOrderRequestInputSchema,
	supplierOrderStatsSchema,
	supplierOrderStatusSchema,
} from "~/schemas/admin/supplier-order.schemas";

export type SupplierOrderStatus = z.output<typeof supplierOrderStatusSchema>;
export type SupplierOrderCommandKey = z.output<
	typeof supplierOrderCommandKeySchema
>;
export type SupplierOrderAvailableAction = z.output<
	typeof supplierOrderAvailableActionSchema
>;
export type SupplierOrderIdInput = z.output<typeof supplierOrderIdInputSchema>;
export type SupplierOrderListInput = z.output<
	typeof supplierOrderListInputSchema
>;
export type SupplierOrderListItem = z.output<
	typeof supplierOrderListItemSchema
>;
export type SupplierOrderListOutput = z.output<
	typeof supplierOrderListOutputSchema
>;
export type SupplierOrderDetail = z.output<typeof supplierOrderDetailSchema>;
export type SupplierOrderStats = z.output<typeof supplierOrderStatsSchema>;
export type SupplierOrderRequestInput = z.output<
	typeof supplierOrderRequestInputSchema
>;
export type SupplierOrderConfirmInput = z.output<
	typeof supplierOrderConfirmInputSchema
>;
/** Pre-transform shape the confirm form binds to (`externalReference` optional). */
export type SupplierOrderConfirmFormInput = z.input<
	typeof supplierOrderConfirmInputSchema
>;
export type SupplierOrderCancelInput = z.output<
	typeof supplierOrderCancelInputSchema
>;
export type SupplierOrderCancelLineInput = z.output<
	typeof supplierOrderCancelLineInputSchema
>;
export type SupplierOrderRegisterDispatchInput = z.output<
	typeof supplierOrderRegisterDispatchInputSchema
>;
/** Pre-transform shape the dispatch form binds to (`trackingCode` optional). */
export type SupplierOrderRegisterDispatchFormInput = z.input<
	typeof supplierOrderRegisterDispatchInputSchema
>;
