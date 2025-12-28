import { z } from "zod";

export const ADDRESS_TYPES = [
  "HOME",
  "WORK",
  "SHIPPING",
  "BILLING",
  "FRACTIONING",
  "SUPPLIER",
  "PICKUP",
  "CARRIER",
] as const;

export const ADDRESS_TYPE_LABELS: Record<
  (typeof ADDRESS_TYPES)[number],
  string
> = {
  HOME: "Hogar",
  WORK: "Trabajo",
  SHIPPING: "Envío",
  BILLING: "Facturación",
  FRACTIONING: "Fraccionamiento",
  SUPPLIER: "Proveedor",
  PICKUP: "Punto de retiro",
  CARRIER: "Transportista",
};

const relationNumberField = z.number().int().positive().optional().nullable();

const relationStringField = z
  .string()
  .trim()
  .max(191, "El identificador no puede superar los 191 caracteres")
  .optional()
  .nullable();

const baseAddressSchema = z.object({
  type: z.enum(ADDRESS_TYPES, {
    errorMap: () => ({
      message: "Selecciona un tipo de dirección válido",
    }),
  }),
  fullAddress: z
    .string()
    .trim()
    .min(1, "La dirección completa es requerida")
    .max(500, "La dirección completa no puede superar los 500 caracteres"),
  street: z
    .string()
    .trim()
    .min(1, "La calle es requerida")
    .max(255, "La calle no puede superar los 255 caracteres"),
  number: z
    .string()
    .trim()
    .min(1, "El número es requerido")
    .max(20, "El número no puede superar los 20 caracteres"),
  city: z
    .string()
    .trim()
    .min(1, "La ciudad es requerida")
    .max(255, "La ciudad no puede superar los 255 caracteres"),
  state: z
    .string()
    .trim()
    .min(1, "La provincia es requerida")
    .max(255, "La provincia no puede superar los 255 caracteres"),
  postalCode: z
    .string()
    .trim()
    .min(1, "El código postal es requerido")
    .max(20, "El código postal no puede superar los 20 caracteres"),
  country: z
    .string()
    .trim()
    .min(1, "El país es requerido")
    .max(255, "El país no puede superar los 255 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "La descripción no puede superar los 500 caracteres")
    .optional()
    .nullable(),
  userId: relationStringField,
  supplierId: relationNumberField,
  carrierId: relationNumberField,
  isActive: z.boolean().default(true),
});

export const createAddressSchema = baseAddressSchema;

export const updateAddressSchema = baseAddressSchema.extend({
  id: z.number().int().positive("El identificador debe ser un entero positivo"),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
