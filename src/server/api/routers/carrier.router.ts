import { z } from "zod";

import { createCarrierSchema, updateCarrierSchema } from "~/schema/carrier";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const sanitizeString = (value?: string | null) => {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const carrierRouter = createTRPCRouter({
  getAllCarriers: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.carrier.findMany({
      where: { deleted: false },
      include: {
        _count: {
          select: {
            addresses: true,
            shipments: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  }),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;

      return await ctx.db.carrier.findMany({
        where: {
          deleted: false,
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { email: { contains: query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        take: limit,
        orderBy: { name: "asc" },
      });
    }),

  createCarrier: protectedProcedure
    .input(createCarrierSchema)
    .mutation(async ({ ctx, input }) => {
      const payload = {
        name: input.name.trim(),
        description: sanitizeString(input.description),
        image: sanitizeString(input.image),
        phone: sanitizeString(input.phone),
        email: sanitizeString(input.email),
        website: sanitizeString(input.website),
        taxId: sanitizeString(input.taxId),
        taxType: sanitizeString(input.taxType),
        isActive: input.isActive,
      };

      return await ctx.db.carrier.create({
        data: payload,
        include: {
          _count: {
            select: {
              addresses: true,
              shipments: true,
            },
          },
        },
      });
    }),

  updateCarrier: protectedProcedure
    .input(updateCarrierSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const payload = {
        name: rest.name.trim(),
        description: sanitizeString(rest.description),
        image: sanitizeString(rest.image),
        phone: sanitizeString(rest.phone),
        email: sanitizeString(rest.email),
        website: sanitizeString(rest.website),
        taxId: sanitizeString(rest.taxId),
        taxType: sanitizeString(rest.taxType),
        isActive: rest.isActive,
      };

      return await ctx.db.carrier.update({
        where: { id },
        data: payload,
        include: {
          _count: {
            select: {
              addresses: true,
              shipments: true,
            },
          },
        },
      });
    }),

  deleteCarrier: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        hardDelete: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.hardDelete) {
        return await ctx.db.carrier.delete({
          where: { id: input.id },
          select: { id: true },
        });
      }

      return await ctx.db.carrier.update({
        where: { id: input.id },
        data: { deleted: true, isActive: false },
        select: { id: true },
      });
    }),
});
