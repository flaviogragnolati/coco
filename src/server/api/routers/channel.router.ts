import { z } from "zod";

import { createChannelSchema, updateChannelSchema } from "~/schema/channel";
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

export const channelRouter = createTRPCRouter({
  getAllChannels: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.channel.findMany({
      include: {
        _count: {
          select: {
            notifications: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }),

  createChannel: protectedProcedure
    .input(createChannelSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.channel.create({
        data: {
          type: input.type,
          name: input.name.trim(),
          description: sanitizeString(input.description),
          token: input.token.trim(),
        },
        include: {
          _count: {
            select: {
              notifications: true,
            },
          },
        },
      });
    }),

  updateChannel: protectedProcedure
    .input(updateChannelSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return await ctx.db.channel.update({
        where: { id },
        data: {
          type: rest.type,
          name: rest.name.trim(),
          description: sanitizeString(rest.description),
          token: rest.token.trim(),
        },
        include: {
          _count: {
            select: {
              notifications: true,
            },
          },
        },
      });
    }),

  deleteChannel: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.channel.delete({
        where: { id: input.id },
        select: { id: true },
      });
    }),
});
