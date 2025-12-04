import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { CartStatus, LotStatus, PaymentStatus } from "~/prisma-client";

export const cartRouter = createTRPCRouter({
  // Get all carts
  getAll: publicProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(CartStatus).optional(),
          userId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        status?: CartStatus;
        userId?: string;
      } = {};

      if (input?.status) where.status = input.status;
      if (input?.userId) where.userId = input.userId;

      return await ctx.db.cart.findMany({
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
                    },
                  },
                  category: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Get single cart by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.cart.findUnique({
        where: { id: input.id },
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
                      description: true,
                      phone: true,
                      email: true,
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
                select: {
                  id: true,
                  trackingNumber: true,
                  status: true,
                },
              },
            },
          },
          userPayments: true,
        },
      });
    }),

  // Get cart with full trace (nested data for cart traceability page)
  getWithTrace: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.cart.findUnique({
        where: { id: input.id },
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
                      description: true,
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
                },
              },
            },
          },
          userPayments: true,
        },
      });
    }),

  // Create new cart
  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        addressId: z.number(),
        items: z.array(
          z.object({
            productId: z.number(),
            quantity: z.number().min(1),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch products to get pricing and details
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: input.items.map((item) => item.productId) },
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      return await ctx.db.cart.create({
        data: {
          userId: input.userId,
          addressId: input.addressId,
          status: CartStatus.DRAFT,
          items: {
            create: input.items.map((item) => {
              const product = productMap.get(item.productId);
              if (!product) {
                throw new Error(`Product ${item.productId} not found`);
              }
              return {
                productId: item.productId,
                quantity: item.quantity,
                unit: product.customerUnit,
                price: product.price,
                publicPrice: product.publicPrice,
                productSnapshot: JSON.stringify(product),
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }),

  // Update cart status
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.nativeEnum(CartStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.cart.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          items: true,
        },
      });
    }),

  // Mark cart as paid
  pay: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Update cart status to COMPLETED
      const cart = await ctx.db.cart.update({
        where: { id: input.id },
        data: { status: CartStatus.COMPLETED },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Update payment status if exists
      await ctx.db.userPayment.updateMany({
        where: { cartId: input.id },
        data: { status: "COMPLETED" },
      });

      return cart;
    }),

  // Split cart into lots grouped by supplier
  splitToLots: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cart = await ctx.db.cart.findUnique({
        where: { id: input.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  supplier: true,
                },
              },
            },
          },
        },
      });

      if (!cart) {
        throw new Error("Cart not found");
      }

      type CartItem = (typeof cart.items)[number];

      // Group items by supplier
      const itemsBySupplier = cart.items.reduce(
        (acc: Record<number, CartItem[]>, item: CartItem) => {
          const supplierId = item.product.supplierId;
          if (!acc[supplierId]) {
            acc[supplierId] = [];
          }
          acc[supplierId].push(item);
          return acc;
        },
        {} as Record<number, CartItem[]>,
      );

      // Create lots for each supplier
      const lots = await Promise.all(
        Object.entries(itemsBySupplier).map(async ([supplierId, items]) => {
          // Generate tracking number
          const lotCount = await ctx.db.lot.count();
          const trackingNumber = `LOT-${new Date().getFullYear()}-${String(lotCount + 1).padStart(4, "0")}`;

          return await ctx.db.lot.create({
            data: {
              trackingNumber,
              status: LotStatus.PENDING,
              scheduledAt: new Date(),
              supplierId: Number.parseInt(supplierId),
              items: {
                connect: items.map((item) => ({ id: item.id })),
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
      );

      return lots;
    }),

  // Add item to cart
  addItem: publicProcedure
    .input(
      z.object({
        cartId: z.number(),
        productId: z.number(),
        quantity: z.number().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findUnique({
        where: { id: input.productId },
      });

      if (!product) {
        throw new Error("Product not found");
      }

      return await ctx.db.cartItem.create({
        data: {
          cartId: input.cartId,
          productId: input.productId,
          quantity: input.quantity,
          unit: product.customerUnit,
          price: product.price,
          publicPrice: product.publicPrice,
          productSnapshot: JSON.stringify(product),
        },
        include: {
          product: true,
        },
      });
    }),

  // Update cart item quantity
  updateItemQuantity: publicProcedure
    .input(
      z.object({
        itemId: z.number(),
        quantity: z.number().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.cartItem.update({
        where: { id: input.itemId },
        data: { quantity: input.quantity },
      });
    }),

  // Remove item from cart
  removeItem: publicProcedure
    .input(
      z.object({
        itemId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.cartItem.delete({
        where: { id: input.itemId },
      });
    }),

  // Delete cart
  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.cart.delete({
        where: { id: input.id },
      });
    }),
});
