import { z } from "zod";

export const CartStatusSchema = z.enum([
  "DRAFT",
  "PAID",
  "TRANSFERRED_TO_LOTS",
]);

export const LotStatusSchema = z.enum([
  "PENDING",
  "READY_TO_ORDER",
  "ORDER_SENT",
  "CONFIRMED_BY_PROVIDER",
  "PACKAGED",
]);

export const PackageStatusSchema = z.enum([
  "CREATED",
  "READY_FOR_PICKUP",
  "IN_TRANSIT",
  "DELIVERED",
]);

export const ShipmentStatusSchema = z.enum([
  "ASSEMBLING",
  "IN_TRANSIT",
  "ARRIVED",
  "CLOSED",
]);

export type CartStatus = z.infer<typeof CartStatusSchema>;
export type LotStatus = z.infer<typeof LotStatusSchema>;
export type PackageStatus = z.infer<typeof PackageStatusSchema>;
export type ShipmentStatus = z.infer<typeof ShipmentStatusSchema>;
