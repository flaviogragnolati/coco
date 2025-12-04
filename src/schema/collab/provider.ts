import { z } from "zod";

export const ProviderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  contact: z.string().min(1),
  pickupPolicy: z.string().min(1),
});

export type Provider = z.infer<typeof ProviderSchema>;
