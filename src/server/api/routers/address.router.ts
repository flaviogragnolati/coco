import { z } from "zod";

import { createAddressSchema, updateAddressSchema } from "~/schema/address";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { AddressType } from "~/prisma-client";

const sanitizeString = (value?: string | null) => {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeAddressPayload = (
  input: z.infer<typeof createAddressSchema>,
) => ({
  type: input.type,
  fullAddress: input.fullAddress.trim(),
  street: input.street.trim(),
  number: input.number.trim(),
  city: input.city.trim(),
  state: input.state.trim(),
  postalCode: input.postalCode.trim(),
  country: input.country.trim(),
  description: sanitizeString(input.description),
  userId: sanitizeString(input.userId) ?? null,
  supplierId: input.supplierId ?? null,
  carrierId: input.carrierId ?? null,
  isActive: input.isActive,
});

export const addressRouter = createTRPCRouter({
  getAllAddresses: publicProcedure.query(async ({ ctx }) => {
    const addresses = await ctx.db.address.findMany({
      where: { deleted: false },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        carrier: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return addresses.map((address) => ({
      ...address,
      supplier: address.supplier ?? null,
      carrier: address.carrier ?? null,
      user: address.user ?? null,
    }));
  }),

  getUserAddresses: protectedProcedure.query(async ({ ctx }) => {
    const addresses = await ctx.db.address.findMany({
      where: { userId: ctx.session.user.id, deleted: false },
      orderBy: [{ createdAt: "desc" }],
    });

    return addresses;
  }),

  getPickupAddresses: publicProcedure
    .input(
      z
        .object({
          city: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        type: AddressType;
        deleted: boolean;
        city?: { contains: string; mode: "insensitive" };
      } = {
        type: AddressType.PICKUP,
        deleted: false,
      };

      if (input?.city) {
        where.city = { contains: input.city, mode: "insensitive" };
      }

      const addresses = await ctx.db.address.findMany({
        where,
        orderBy: [{ city: "asc" }],
      });

      return addresses;
    }),

  createAddress: protectedProcedure
    .input(createAddressSchema)
    .mutation(async ({ ctx, input }) => {
      const payload = normalizeAddressPayload(input);

      return await ctx.db.address.create({
        data: payload,
        include: {
          supplier: {
            select: { id: true, name: true },
          },
          carrier: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
      });
    }),

  updateAddress: protectedProcedure
    .input(updateAddressSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const payload = normalizeAddressPayload(rest);

      return await ctx.db.address.update({
        where: { id },
        data: payload,
        include: {
          supplier: {
            select: { id: true, name: true },
          },
          carrier: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
      });
    }),

  deleteAddress: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        hardDelete: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.hardDelete) {
        return await ctx.db.address.delete({
          where: { id: input.id },
          select: { id: true },
        });
      }

      return await ctx.db.address.update({
        where: { id: input.id },
        data: { deleted: true, isActive: false },
        select: { id: true },
      });
    }),
});
