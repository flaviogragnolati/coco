import { z } from "zod";

import { createCategorySchema, updateCategorySchema } from "~/schema/category";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const normalizeTags = (tags?: string[] | null) => {
  if (!tags) return [];
  return tags
    .map((tag) => tag.trim())
    .filter(
      (tag, index, array) => tag.length > 0 && array.indexOf(tag) === index,
    );
};

const sanitizeString = (value?: string | null) => {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const categoryRouter = createTRPCRouter({
  getAllCategories: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.category.findMany({
      where: { deleted: false },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });
  }),

  createCategory: protectedProcedure
    .input(createCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const payload = {
        name: input.name.trim(),
        description: sanitizeString(input.description),
        image: sanitizeString(input.image),
        tags: normalizeTags(input.tags),
        isActive: input.isActive,
      };

      return await ctx.db.category.create({
        data: payload,
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });
    }),

  updateCategory: protectedProcedure
    .input(updateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const payload = {
        name: rest.name.trim(),
        description: sanitizeString(rest.description),
        image: sanitizeString(rest.image),
        tags: normalizeTags(rest.tags),
        isActive: rest.isActive,
      };

      return await ctx.db.category.update({
        where: { id },
        data: payload,
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });
    }),

  deleteCategory: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        hardDelete: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.hardDelete) {
        return await ctx.db.category.delete({
          where: { id: input.id },
          select: { id: true },
        });
      }

      return await ctx.db.category.update({
        where: { id: input.id },
        data: { deleted: true, isActive: false },
        select: { id: true },
      });
    }),
});
