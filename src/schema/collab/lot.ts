import { z } from "zod";

import { LotStatusSchema } from "./enums";
import { CartItemContributionSchema } from "./cart";

export const LotItemSchema = z.object({
  id: z.string().min(1),
  lotId: z.string().min(1),
  productId: z.string().min(1),
  totalQty: z.number().nonnegative(),
  contributions: z.array(CartItemContributionSchema),
});

export const LotSchema = z.object({
  id: z.string().min(1),
  providerId: z.string().min(1),
  status: LotStatusSchema,
  scheduledAt: z.coerce.date(),
  consolidatedAt: z.coerce.date().optional().nullable(),
  orderSentAt: z.coerce.date().optional().nullable(),
  confirmedAt: z.coerce.date().optional().nullable(),
  items: z.array(LotItemSchema),
});

export type Lot = z.infer<typeof LotSchema>;
export type LotItem = z.infer<typeof LotItemSchema>;
