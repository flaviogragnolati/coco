import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { LotStatus, PackageStatus } from "~/prisma-client";

export const lotRouter = createTRPCRouter({
  // Get all lots
  getAll: publicProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(LotStatus).optional(),
          supplierId: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        status?: LotStatus;
        supplierId?: number;
      } = {};

      if (input?.status) where.status = input.status;
      if (input?.supplierId) where.supplierId = input.supplierId;

      return await ctx.db.lot.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              description: true,
              phone: true,
              email: true,
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
          packages: {
            select: {
              id: true,
              trackingId: true,
              status: true,
              weight: true,
              volume: true,
            },
          },
          lotPayments: true,
          _count: {
            select: {
              items: true,
              packages: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Get single lot by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.lot.findUnique({
        where: { id: input.id },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              description: true,
              phone: true,
              email: true,
              website: true,
              pickupPolicy: true,
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
          packages: {
            include: {
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
                    },
                  },
                },
              },
            },
          },
          lotPayments: true,
        },
      });
    }),

  // Create new lot
  create: publicProcedure
    .input(
      z.object({
        supplierId: z.number(),
        cartItemIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Generate tracking number
      const lotCount = await ctx.db.lot.count();
      const trackingNumber = `LOT-${new Date().getFullYear()}-${String(lotCount + 1).padStart(4, "0")}`;

      return await ctx.db.lot.create({
        data: {
          trackingNumber,
          status: LotStatus.PENDING,
          scheduledAt: new Date(),
          supplierId: input.supplierId,
          items: {
            connect: input.cartItemIds.map((id) => ({ id })),
          },
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }),

  // Update lot status
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.nativeEnum(LotStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: {
        status: LotStatus;
        consolidatedAt?: Date;
        orderSentAt?: Date;
        confirmedAt?: Date;
      } = {
        status: input.status,
      };

      // Set timestamps based on status
      if (
        input.status === LotStatus.READY_TO_ORDER &&
        !updateData.consolidatedAt
      ) {
        updateData.consolidatedAt = new Date();
      }
      if (input.status === LotStatus.ORDER_SENT) {
        updateData.orderSentAt = new Date();
      }
      if (input.status === LotStatus.CONFIRMED_BY_PROVIDER) {
        updateData.confirmedAt = new Date();
      }

      return await ctx.db.lot.update({
        where: { id: input.id },
        data: updateData,
        include: {
          items: true,
        },
      });
    }),

  // Recalculate lot to ensure MOQ is met
  recalculate: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lot = await ctx.db.lot.findUnique({
        where: { id: input.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!lot) {
        throw new Error("Lot not found");
      }

      // Group items by product and sum quantities
      const productQuantities = lot.items.reduce(
        (acc, item) => {
          const existing = acc[item.productId];
          if (!existing) {
            acc[item.productId] = {
              product: item.product,
              totalQuantity: item.quantity,
            };
          } else {
            existing.totalQuantity += item.quantity;
          }
          return acc;
        },
        {} as Record<
          number,
          { product: (typeof lot.items)[0]["product"]; totalQuantity: number }
        >,
      );

      // Check MOQ compliance
      const moqResults = Object.values(productQuantities).map(
        ({ product, totalQuantity }) => ({
          productId: product.id,
          productName: product.name,
          totalQuantity,
          supplierMoq: product.supplierMoq,
          isMoqMet: totalQuantity >= product.supplierMoq,
          shortfall: Math.max(0, product.supplierMoq - totalQuantity),
        }),
      );

      const allMoqMet = moqResults.every((r) => r.isMoqMet);

      return {
        lot,
        moqResults,
        allMoqMet,
      };
    }),

  // Mark lot ready to order
  markReady: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.lot.update({
        where: { id: input.id },
        data: {
          status: LotStatus.READY_TO_ORDER,
          consolidatedAt: new Date(),
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }),

  // Send order to supplier
  sendOrder: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.lot.update({
        where: { id: input.id },
        data: {
          status: LotStatus.ORDER_SENT,
          orderSentAt: new Date(),
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }),

  // Confirm order (supplier confirms)
  confirm: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.lot.update({
        where: { id: input.id },
        data: {
          status: LotStatus.CONFIRMED_BY_PROVIDER,
          confirmedAt: new Date(),
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }),

  // Create packages from lot
  createPackages: publicProcedure
    .input(
      z.object({
        id: z.number(),
        packages: z.array(
          z.object({
            weight: z.number(),
            volume: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Update lot status to PACKAGED
      await ctx.db.lot.update({
        where: { id: input.id },
        data: { status: LotStatus.PACKAGED },
      });

      // Get package count for tracking IDs
      const packageCount = await ctx.db.package.count();

      // Create packages
      const packages = await Promise.all(
        input.packages.map(async (pkg, index) => {
          const trackingId = `PKG-${new Date().getFullYear()}-${String(packageCount + index + 1).padStart(4, "0")}`;

          return await ctx.db.package.create({
            data: {
              trackingId,
              status: PackageStatus.CREATED,
              weight: pkg.weight,
              volume: pkg.volume,
              lotId: input.id,
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
      );

      return packages;
    }),

  // Delete lot
  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.lot.delete({
        where: { id: input.id },
      });
    }),
});
