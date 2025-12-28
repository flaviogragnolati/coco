import { z } from "zod";

const optionalPositiveNumber = z
  .union([
    z.number().gt(0, "Debe ser un valor mayor a 0"),
    z.literal(null),
    z.undefined(),
  ])
  .transform((value) => (value === null ? undefined : value));

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del producto es requerido")
    .max(255, "El nombre debe tener menos de 255 caracteres"),
  description: z
    .string()
    .trim()
    .max(2000, "La descripción debe tener menos de 2000 caracteres")
    .optional()
    .nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  categorySlug: z.string().trim().min(1).optional().nullable(),
  tags: z.array(z.string().trim()).default([]),

  // Supplier pricing
  price: z
    .number({ invalid_type_error: "El precio de proveedor es requerido" })
    .gt(0, "El precio debe ser mayor a 0"),
  priceUnit: z.string().trim().min(1, "Seleccione una unidad de precio"),
  priceUnitMultiplier: z
    .number({ invalid_type_error: "El multiplicador es requerido" })
    .gt(0, "El multiplicador debe ser mayor a 0")
    .default(1),

  // Public pricing
  publicPrice: z
    .number({ invalid_type_error: "El precio público es requerido" })
    .gt(0, "El precio debe ser mayor a 0"),
  publicPriceUnit: z
    .string()
    .trim()
    .min(1, "Seleccione una unidad de precio público"),
  publicPriceMultiplier: z
    .number({ invalid_type_error: "El multiplicador es requerido" })
    .gt(0, "El multiplicador debe ser mayor a 0")
    .default(1),

  // Supplier MOQ
  supplierMoq: z
    .number({
      invalid_type_error: "La cantidad mínima del proveedor es requerida",
    })
    .gt(0, "La cantidad mínima debe ser mayor a 0"),
  supplierUnit: z.string().trim().min(1, "Seleccione una unidad"),
  supplierUnitMultiplier: z
    .number({ invalid_type_error: "El multiplicador es requerido" })
    .gt(0, "El multiplicador debe ser mayor a 0")
    .default(1),

  // Customer MOQ
  customerMoq: z
    .number({
      invalid_type_error: "La cantidad mínima del cliente es requerida",
    })
    .gt(0, "La cantidad mínima debe ser mayor a 0"),
  customerUnit: z.string().trim().min(1, "Seleccione una unidad"),
  customerUnitMultiplier: z
    .number({ invalid_type_error: "El multiplicador es requerido" })
    .gt(0, "El multiplicador debe ser mayor a 0")
    .default(1),

  currency: z.string().trim().min(1, "Seleccione una moneda"),
  sku: z.string().trim().max(100).optional().nullable(),
  supplierSku: z.string().trim().max(100).optional().nullable(),
  code: z.string().trim().max(100).optional().nullable(),
  mainImage: z
    .string()
    .trim()
    .url("La imagen principal debe ser una URL válida")
    .optional()
    .nullable(),
  additionalImages: z
    .array(z.string().trim().url("Cada imagen debe ser una URL válida"))
    .optional()
    .default([]),
  supplierId: z
    .number({ invalid_type_error: "Seleccione un proveedor" })
    .int()
    .positive("Seleccione un proveedor"),
  isActive: z.boolean().default(true),
});

export const createProductSchema = productFormSchema;

export const updateProductSchema = productFormSchema.extend({
  id: z.number().int().positive(),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
