import type { z } from "zod";

import type {
	carrierOrderAddShipmentsInputSchema,
	carrierOrderAvailableActionSchema,
	carrierOrderCommandInputSchema,
	carrierOrderCommandKeySchema,
	carrierOrderCreateInputSchema,
	carrierOrderDeleteInputSchema,
	carrierOrderDetailSchema,
	carrierOrderFieldsSchema,
	carrierOrderListInputSchema,
	carrierOrderListItemSchema,
	carrierOrderListOutputSchema,
	carrierOrderReasonInputSchema,
	carrierOrderRemoveShipmentInputSchema,
	carrierOrderShipmentSummarySchema,
	carrierOrderStatsSchema,
	carrierOrderStatusSchema,
	carrierOrderUpdateInputSchema,
} from "~/schemas/admin/carrier-order.schemas";

export type CarrierOrderStatus = z.output<typeof carrierOrderStatusSchema>;
export type CarrierOrderCommandKey = z.output<
	typeof carrierOrderCommandKeySchema
>;
export type CarrierOrderAvailableAction = z.output<
	typeof carrierOrderAvailableActionSchema
>;
export type CarrierOrderListInput = z.output<
	typeof carrierOrderListInputSchema
>;
export type CarrierOrderListItem = z.output<typeof carrierOrderListItemSchema>;
export type CarrierOrderListOutput = z.output<
	typeof carrierOrderListOutputSchema
>;
export type CarrierOrderDetail = z.output<typeof carrierOrderDetailSchema>;
export type CarrierOrderShipmentSummary = z.output<
	typeof carrierOrderShipmentSummarySchema
>;
export type CarrierOrderStats = z.output<typeof carrierOrderStatsSchema>;
/** The identity fields the create/edit form edits — `status` is never among them. */
export type CarrierOrderFormInput = z.input<typeof carrierOrderFieldsSchema>;
export type CarrierOrderFormValues = z.output<typeof carrierOrderFieldsSchema>;
export type CarrierOrderCreateInput = z.output<
	typeof carrierOrderCreateInputSchema
>;
export type CarrierOrderUpdateInput = z.output<
	typeof carrierOrderUpdateInputSchema
>;
export type CarrierOrderCommandInput = z.output<
	typeof carrierOrderCommandInputSchema
>;
export type CarrierOrderReasonInput = z.output<
	typeof carrierOrderReasonInputSchema
>;
export type CarrierOrderAddShipmentsInput = z.output<
	typeof carrierOrderAddShipmentsInputSchema
>;
export type CarrierOrderRemoveShipmentInput = z.output<
	typeof carrierOrderRemoveShipmentInputSchema
>;
export type CarrierOrderDeleteInput = z.output<
	typeof carrierOrderDeleteInputSchema
>;
