import { z } from "zod";

export const categoryTagsSchema = z
  .array(z.string().trim())
  .optional()
  .default([]);

export const baseCategorySchema = z.object({
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
  tags: categoryTagsSchema,
  isActive: z.boolean().default(true),
});

export const createCategorySchema = baseCategorySchema;

export const updateCategorySchema = baseCategorySchema.extend({
  id: z.number().int().positive("El identificador debe ser un entero positivo"),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
