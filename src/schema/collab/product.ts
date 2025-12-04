import { z } from "zod";

export const ProductSchema = z.object({
  id: z.string().min(1),
  providerId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().min(1),
  unit: z.string().min(1),
  minFractionPerUser: z
    .number()
    .int()
    .positive("La fracción mínima debe ser positiva"),
  moqByProvider: z
    .number()
    .int()
    .positive("El MOQ del proveedor debe ser positivo"),
  price: z.number().positive("El precio debe ser mayor que 0"),
  active: z.boolean().default(true),
});

export type Product = z.infer<typeof ProductSchema>;
