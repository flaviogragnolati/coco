import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { User } from "~/prisma-client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        roles: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const sanitizedUser = sanitizeUser(user);

    return {
      ...sanitizedUser,
      roles: user.roles.map((role) => role.type),
    };
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

      const users = await ctx.db.user.findMany({
        where: query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : undefined,
        select: {
          id: true,
          name: true,
          email: true,
        },
        take: limit,
        orderBy: { name: "asc" },
      });

      return users;
    }),
});

function sanitizeUser(user: User) {
  return {
    ...user,
    // Exclude sensitive fields
    password: undefined,
  };
}
