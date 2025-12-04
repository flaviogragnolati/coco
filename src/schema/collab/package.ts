import { z } from "zod";

import { PackageStatusSchema } from "./enums";

export const PackageSchema = z.object({
  id: z.string().min(1),
  lotId: z.string().min(1),
  status: PackageStatusSchema,
  weight: z.number().nonnegative().optional().nullable(),
  volume: z.number().nonnegative().optional().nullable(),
});

export type Package = z.infer<typeof PackageSchema>;
