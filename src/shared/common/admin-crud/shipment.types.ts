import type { z } from "zod";

import type {
	deliveryModeSchema,
	shipmentAddPackagesInputSchema,
	shipmentAvailableActionSchema,
	shipmentCommandKeySchema,
	shipmentCreateEndUserInputSchema,
	shipmentDeliverInputSchema,
	shipmentDetailSchema,
	shipmentExceptionInputSchema,
	shipmentGetByIdInputSchema,
	shipmentIdInputSchema,
	shipmentListInputSchema,
	shipmentListItemSchema,
	shipmentListOutputSchema,
	shipmentReceiveInputSchema,
	shipmentRetryInputSchema,
	shipmentStatsSchema,
	shipmentStatusSchema,
	shipmentTypeSchema,
} from "~/schemas/admin/shipment.schemas";

export type ShipmentStatus = z.output<typeof shipmentStatusSchema>;
export type ShipmentType = z.output<typeof shipmentTypeSchema>;
export type ShipmentCommandKey = z.output<typeof shipmentCommandKeySchema>;
export type ShipmentAvailableAction = z.output<
	typeof shipmentAvailableActionSchema
>;
export type ShipmentListInput = z.output<typeof shipmentListInputSchema>;
export type ShipmentListItem = z.output<typeof shipmentListItemSchema>;
export type ShipmentListOutput = z.output<typeof shipmentListOutputSchema>;
export type ShipmentDetail = z.output<typeof shipmentDetailSchema>;
export type ShipmentStats = z.output<typeof shipmentStatsSchema>;
export type ShipmentGetByIdInput = z.output<typeof shipmentGetByIdInputSchema>;
export type ShipmentIdInput = z.output<typeof shipmentIdInputSchema>;
export type ShipmentReceiveInput = z.output<typeof shipmentReceiveInputSchema>;
/** Pre-transform shape the receive form binds to (`final` defaulted). */
export type ShipmentReceiveFormInput = z.input<
	typeof shipmentReceiveInputSchema
>;
export type ShipmentExceptionInput = z.output<
	typeof shipmentExceptionInputSchema
>;
export type ShipmentRetryInput = z.output<typeof shipmentRetryInputSchema>;
export type DeliveryMode = z.output<typeof deliveryModeSchema>;
export type ShipmentCreateEndUserInput = z.output<
	typeof shipmentCreateEndUserInputSchema
>;
export type ShipmentAddPackagesInput = z.output<
	typeof shipmentAddPackagesInputSchema
>;
export type ShipmentDeliverInput = z.output<typeof shipmentDeliverInputSchema>;
