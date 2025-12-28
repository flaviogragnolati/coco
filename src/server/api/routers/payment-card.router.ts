import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  CARD_BRANDS,
  createPaymentCardSchema,
  updatePaymentCardSchema,
} from "~/schema/payment-card";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const sanitizeCardNumber = (cardNumber: string) => cardNumber.replace(/\D/g, "");

const normalizeExpiryYear = (year: string) => {
  const normalized = year.trim();
  if (normalized.length === 2) {
    return Number.parseInt(`20${normalized}`, 10);
  }
  return Number.parseInt(normalized, 10);
};

const detectCardBrand = (
  cardNumber: string,
): (typeof CARD_BRANDS)[number] => {
  if (/^4/.test(cardNumber)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) return "MASTERCARD";
  if (/^3[47]/.test(cardNumber)) return "AMEX";
  if (/^(30[0-5]|3[68])/.test(cardNumber)) return "DINERS";
  if (/^(6011|65)/.test(cardNumber)) return "DISCOVER";
  return "OTHER";
};

const normalizePaymentCardPayload = (
  input: z.infer<typeof createPaymentCardSchema>,
  userId: string,
) => {
  const sanitizedNumber = sanitizeCardNumber(input.cardNumber);

  return {
    cardholderName: input.cardholderName.trim(),
    cardLast4: sanitizedNumber.slice(-4),
    expiryMonth: Number.parseInt(input.expiryMonth.trim(), 10),
    expiryYear: normalizeExpiryYear(input.expiryYear),
    cardBrand: input.cardBrand ?? detectCardBrand(sanitizedNumber),
    isDefault: input.isDefault ?? false,
    isActive: input.isActive ?? true,
    deleted: false,
    userId,
  };
};

export const paymentCardRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.savedPaymentCard.findMany({
      where: {
        userId: ctx.session.user.id,
        deleted: false,
        isActive: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }),

  getById: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const card = await ctx.db.savedPaymentCard.findFirst({
        where: { id: input.id, userId: ctx.session.user.id, deleted: false },
      });

      if (!card) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tarjeta no encontrada",
        });
      }

      return card;
    }),

  create: protectedProcedure
    .input(createPaymentCardSchema)
    .mutation(async ({ ctx, input }) => {
      const payload = normalizePaymentCardPayload(input, ctx.session.user.id);

      return ctx.db.$transaction(async (tx) => {
        if (payload.isDefault) {
          await tx.savedPaymentCard.updateMany({
            where: {
              userId: ctx.session.user.id,
              deleted: false,
              isActive: true,
            },
            data: { isDefault: false },
          });
        } else {
          const existingCount = await tx.savedPaymentCard.count({
            where: {
              userId: ctx.session.user.id,
              deleted: false,
              isActive: true,
            },
          });
          if (existingCount === 0) {
            payload.isDefault = true;
          }
        }

        return tx.savedPaymentCard.create({
          data: payload,
        });
      });
    }),

  update: protectedProcedure
    .input(updatePaymentCardSchema)
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.db.savedPaymentCard.findFirst({
        where: { id: input.id, userId: ctx.session.user.id, deleted: false },
      });

      if (!card) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tarjeta no encontrada",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        if (input.isDefault) {
          await tx.savedPaymentCard.updateMany({
            where: {
              userId: ctx.session.user.id,
              deleted: false,
              isActive: true,
            },
            data: { isDefault: false },
          });
        }

        return tx.savedPaymentCard.update({
          where: { id: card.id },
          data: {
            cardholderName: input.cardholderName?.trim() ?? card.cardholderName,
            isDefault: input.isDefault ?? card.isDefault,
            isActive: input.isActive ?? card.isActive,
          },
        });
      });
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const card = await ctx.db.savedPaymentCard.findFirst({
        where: { id: input.id, userId: ctx.session.user.id, deleted: false },
      });

      if (!card) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tarjeta no encontrada",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.savedPaymentCard.update({
          where: { id: input.id },
          data: { deleted: true, isActive: false, isDefault: false },
        });

        if (card.isDefault) {
          const nextDefault = await tx.savedPaymentCard.findFirst({
            where: {
              userId: ctx.session.user.id,
              deleted: false,
              isActive: true,
            },
            orderBy: { createdAt: "desc" },
          });

          if (nextDefault) {
            await tx.savedPaymentCard.update({
              where: { id: nextDefault.id },
              data: { isDefault: true },
            });
          }
        }

        return { id: input.id };
      });
    }),
});
