import { z } from "zod";

import { CartStatus } from "~/prisma-client";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

export const orderRouter = createTRPCRouter({
  test: publicProcedure.input(z.object({ text: z.string() })).query(({ input }) => {
    return {
      message: `Hello ${input.text}`,
    };
  }),

  getUserOrders: protectedProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(CartStatus).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        userId: ctx.session.user.id,
        status: input?.status ?? CartStatus.COMPLETED,
      };

      const orders = await ctx.db.cart.findMany({
        where,
        include: {
          address: true,
          items: {
            include: {
              product: {
                include: {
                  supplier: {
                    select: {
                      id: true,
                      name: true,
                      contactName: true,
                      contactPhone: true,
                      pickupPolicy: true,
                    },
                  },
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
              lot: {
                include: {
                  supplier: {
                    select: {
                      id: true,
                      name: true,
                      contactName: true,
                      contactPhone: true,
                      pickupPolicy: true,
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
                              address: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  lotPayments: true,
                  items: {
                    select: {
                      id: true,
                      productId: true,
                      quantity: true,
                    },
                  },
                },
              },
            },
          },
          userPayments: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return orders.map((order) => ({
        ...order,
        items: order.items.map((item) => {
          if (!item.lot) return item;

          const totalQuantityForProductInLot = item.lot.items.reduce((sum, lotItem) => {
            if (lotItem.productId === item.productId) {
              return sum + lotItem.quantity;
            }
            return sum;
          }, 0);

          return {
            ...item,
            lot: {
              ...item.lot,
              totalQuantityForProductInLot,
            },
          };
        }),
      }));
    }),
});
