import { z } from "zod";

const baseCarrierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(255, "El nombre no puede superar los 255 caracteres"),
  description: z
    .string()
    .trim()
    .max(1000, "La descripción no puede superar los 1000 caracteres")
    .optional()
    .nullable(),
  image: z
    .string()
    .trim()
    .url("La imagen debe ser una URL válida")
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-\(\)\.]{7,20}$/, "El teléfono debe tener un formato válido")
    .optional()
    .nullable(),
  email: z
    .string()
    .trim()
    .email("El correo debe ser válido")
    .optional()
    .nullable(),
  website: z
    .string()
    .trim()
    .url("El sitio web debe ser una URL válida")
    .optional()
    .nullable(),
  taxId: z
    .string()
    .trim()
    .max(50, "El identificador fiscal no puede superar los 50 caracteres")
    .optional()
    .nullable(),
  taxType: z
    .string()
    .trim()
    .max(20, "El tipo de identificación no puede superar los 20 caracteres")
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
});

export const createCarrierSchema = baseCarrierSchema;

export const updateCarrierSchema = baseCarrierSchema.extend({
  id: z.number().int().positive("El identificador debe ser un entero positivo"),
});

export type CreateCarrierInput = z.infer<typeof createCarrierSchema>;
export type UpdateCarrierInput = z.infer<typeof updateCarrierSchema>;
