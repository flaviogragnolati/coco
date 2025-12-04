import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { PackageStatus } from "~/prisma-client";

export const packageRouter = createTRPCRouter({
  // Get all packages
  getAll: publicProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(PackageStatus).optional(),
          lotId: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        status?: PackageStatus;
        lotId?: number;
      } = {};

      if (input?.status) where.status = input.status;
      if (input?.lotId) where.lotId = input.lotId;

      return await ctx.db.package.findMany({
        where,
        include: {
          lot: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
              items: {
                select: {
                  id: true,
                  quantity: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                    },
                  },
                },
              },
            },
          },
          shipments: {
            include: {
              shipment: {
                include: {
                  carrier: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  address: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Get single package by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.package.findUnique({
        where: { id: input.id },
        include: {
          lot: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  phone: true,
                  email: true,
                  addresses: true,
                },
              },
              items: {
                include: {
                  product: {
                    include: {
                      category: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                      brand: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                  cart: {
                    select: {
                      id: true,
                      userId: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
          shipments: {
            include: {
              shipment: {
                include: {
                  carrier: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      phone: true,
                      email: true,
                    },
                  },
                  address: true,
                  shipmentPayments: true,
                },
              },
            },
          },
        },
      });
    }),

  // Create new package
  create: publicProcedure
    .input(
      z.object({
        lotId: z.number(),
        weight: z.number(),
        volume: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Generate tracking ID
      const packageCount = await ctx.db.package.count();
      const trackingId = `PKG-${new Date().getFullYear()}-${String(packageCount + 1).padStart(4, "0")}`;

      return await ctx.db.package.create({
        data: {
          trackingId,
          status: PackageStatus.CREATED,
          weight: input.weight,
          volume: input.volume,
          lotId: input.lotId,
        },
        include: {
          lot: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    }),

  // Update package status
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.nativeEnum(PackageStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.package.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          lot: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    }),

  // Mark package as ready for pickup
  markReadyForPickup: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.package.update({
        where: { id: input.id },
        data: { status: PackageStatus.READY_FOR_PICKUP },
        include: {
          lot: {
            include: {
              supplier: true,
            },
          },
        },
      });
    }),

  // Mark package as in transit
  markInTransit: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.package.update({
        where: { id: input.id },
        data: { status: PackageStatus.IN_TRANSIT },
        include: {
          lot: true,
          shipments: {
            include: {
              shipment: true,
            },
          },
        },
      });
    }),

  // Mark package as delivered
  markDelivered: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.package.update({
        where: { id: input.id },
        data: { status: PackageStatus.DELIVERED },
        include: {
          lot: true,
          shipments: {
            include: {
              shipment: true,
            },
          },
        },
      });
    }),

  // Update package weight and volume
  updateDimensions: publicProcedure
    .input(
      z.object({
        id: z.number(),
        weight: z.number().optional(),
        volume: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      return await ctx.db.package.update({
        where: { id },
        data: updateData,
        include: {
          lot: true,
        },
      });
    }),

  // Delete package
  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.package.delete({
        where: { id: input.id },
      });
    }),
});
