import type { z } from "zod";

import type {
	shipmentDetailSchema,
	shipmentGetByIdInputSchema,
	shipmentListInputSchema,
	shipmentListItemSchema,
	shipmentListOutputSchema,
	shipmentStatsSchema,
	shipmentStatusSchema,
	shipmentTypeSchema,
} from "~/schemas/admin/shipment.schemas";

export type ShipmentStatus = z.output<typeof shipmentStatusSchema>;
export type ShipmentType = z.output<typeof shipmentTypeSchema>;
export type ShipmentListInput = z.output<typeof shipmentListInputSchema>;
export type ShipmentListItem = z.output<typeof shipmentListItemSchema>;
export type ShipmentListOutput = z.output<typeof shipmentListOutputSchema>;
export type ShipmentDetail = z.output<typeof shipmentDetailSchema>;
export type ShipmentStats = z.output<typeof shipmentStatsSchema>;
export type ShipmentGetByIdInput = z.output<typeof shipmentGetByIdInputSchema>;
