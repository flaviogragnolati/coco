import { z } from "zod";

export const CHANNEL_TYPES = [
  "EMAIL",
  "SMS",
  "PUSH",
  "IN_APP",
  "WHATSAPP",
] as const;

const baseChannelSchema = z.object({
  type: z.enum(CHANNEL_TYPES, {
    errorMap: () => ({
      message: "Selecciona un tipo de canal válido",
    }),
  }),
  name: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(255, "El nombre no puede superar los 255 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "La descripción no puede superar los 500 caracteres")
    .optional()
    .nullable(),
  token: z
    .string()
    .trim()
    .min(1, "El token es requerido")
    .max(500, "El token no puede superar los 500 caracteres"),
});

export const createChannelSchema = baseChannelSchema;

export const updateChannelSchema = baseChannelSchema.extend({
  id: z.number().int().positive("El identificador debe ser un entero positivo"),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
