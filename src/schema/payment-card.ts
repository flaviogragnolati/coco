import { z } from "zod";

export const CARD_BRANDS = ["VISA", "MASTERCARD", "AMEX", "DINERS", "DISCOVER", "OTHER"] as const;

const cardNumberSchema = z
  .string()
  .trim()
  .min(12, "El número de tarjeta debe tener al menos 12 dígitos")
  .max(19, "El número de tarjeta no puede superar los 19 dígitos")
  .regex(/^[0-9\s-]+$/, "Solo se permiten números, espacios y guiones");

const expiryMonthSchema = z
  .string()
  .trim()
  .regex(/^(0?[1-9]|1[0-2])$/, "Ingresa un mes válido (01-12)");

const expiryYearSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{2,4}$/, "Ingresa un año válido (ej: 24)");

const cvcSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{3,4}$/, "El CVC debe tener 3 o 4 dígitos");

const cardholderNameSchema = z
  .string()
  .trim()
  .min(2, "El nombre del titular es requerido")
  .max(191, "El nombre no puede superar los 191 caracteres");

const basePaymentCardSchema = z.object({
  cardholderName: cardholderNameSchema,
  cardNumber: cardNumberSchema,
  expiryMonth: expiryMonthSchema,
  expiryYear: expiryYearSchema,
  cvc: cvcSchema,
  cardBrand: z.enum(CARD_BRANDS).optional().default("OTHER"),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const createPaymentCardSchema = basePaymentCardSchema;

export const updatePaymentCardSchema = z.object({
  id: z.number().int().positive("El identificador debe ser un entero positivo"),
  cardholderName: cardholderNameSchema.optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CreatePaymentCardInput = z.infer<typeof createPaymentCardSchema>;
export type UpdatePaymentCardInput = z.infer<typeof updatePaymentCardSchema>;
