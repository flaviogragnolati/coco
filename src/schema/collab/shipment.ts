import { z } from "zod";

import { ShipmentStatusSchema } from "./enums";

export const ShipmentPackageSchema = z.object({
  shipmentId: z.string().min(1),
  packageId: z.string().min(1),
});

export const ShipmentSchema = z.object({
  id: z.string().min(1),
  carrierName: z.string().min(1),
  status: ShipmentStatusSchema,
  eta: z.coerce.date().optional().nullable(),
  startedAt: z.coerce.date().optional().nullable(),
  arrivedAt: z.coerce.date().optional().nullable(),
  packages: z.array(ShipmentPackageSchema),
});

export type Shipment = z.infer<typeof ShipmentSchema>;
export type ShipmentPackage = z.infer<typeof ShipmentPackageSchema>;
