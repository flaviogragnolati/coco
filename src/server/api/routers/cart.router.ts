import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { CartStatus, LotStatus, PaymentStatus } from "~/prisma-client";
import type { Prisma } from "~/prisma-client";
import { createAddressSchema } from "~/schema/address";
import {
  CreditCardPaymentService,
  calculateEtaDate,
  generateTrackingId,
  generateTransactionId,
} from "~/server/service/payment.service";
import type { CreditCardPayload } from "~/server/service/payment.service";
import {
  type CARD_BRANDS,
  createPaymentCardSchema,
} from "~/schema/payment-card";

const validateMoq = (
  _items: Array<{
    quantity: number;
    productId: number;
  }>,
) => true;

const calculateCartTotal = (
  items: Array<{ quantity: number; publicPrice: number; price: number }>,
) =>
  items.reduce(
    (sum, item) => sum + item.quantity * (item.publicPrice ?? item.price),
    0,
  );

const newCardPaymentDetailsSchema = createPaymentCardSchema
  .pick({
    cardholderName: true,
    cardNumber: true,
    expiryMonth: true,
    expiryYear: true,
    cvc: true,
    cardBrand: true,
    isDefault: true,
  })
  .extend({
    saveCard: z.boolean().optional().default(false),
  });

const checkoutPaymentDetailsSchema = z.discriminatedUnion("useSavedCard", [
  z.object({
    useSavedCard: z.literal(true),
    savedPaymentCardId: z
      .number()
      .int()
      .positive("Selecciona una tarjeta guardada"),
  }),
  z
    .object({
      useSavedCard: z.literal(false),
    })
    .merge(newCardPaymentDetailsSchema),
]);

const creditCardCheckoutInputSchema = z.object({
  paymentMethod: z.literal("credit_card"),
  paymentDetails: checkoutPaymentDetailsSchema,
});

const wireTransferCheckoutInputSchema = z.object({
  paymentMethod: z.literal("wire_transfer"),
  paymentDetails: z.object({}).optional(),
});

type CheckoutPaymentDetails = z.infer<typeof checkoutPaymentDetailsSchema>;
type NewCardCheckoutDetails = Extract<
  CheckoutPaymentDetails,
  { useSavedCard: false }
>;

const sanitizeCardNumber = (cardNumber: string) =>
  cardNumber.replace(/\D/g, "");

const normalizeCheckoutExpiryYear = (year: string) => {
  const normalized = year.trim();
  if (normalized.length === 2) {
    return Number.parseInt(`20${normalized}`, 10);
  }
  return Number.parseInt(normalized, 10);
};

const detectCheckoutCardBrand = (
  cardNumber: string,
): (typeof CARD_BRANDS)[number] => {
  if (/^4/.test(cardNumber)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) return "MASTERCARD";
  if (/^3[47]/.test(cardNumber)) return "AMEX";
  if (/^(30[0-5]|3[68])/.test(cardNumber)) return "DINERS";
  if (/^(6011|65)/.test(cardNumber)) return "DISCOVER";
  return "OTHER";
};

const buildChargePayloadFromSavedCard = (card: {
  cardholderName: string;
  cardLast4: string;
  expiryMonth: number;
  expiryYear: number;
}) => ({
  cardholderName: card.cardholderName,
  cardNumber: card.cardLast4.padStart(16, "0"),
  expiryMonth: String(card.expiryMonth).padStart(2, "0"),
  expiryYear: String(card.expiryYear),
  cvc: "000",
});

const buildChargePayloadFromNewCard = (details: NewCardCheckoutDetails) => ({
  cardholderName: details.cardholderName.trim(),
  cardNumber: sanitizeCardNumber(details.cardNumber),
  expiryMonth: details.expiryMonth.trim(),
  expiryYear: details.expiryYear.trim(),
  cvc: details.cvc.trim(),
});

const persistPaymentCard = async (
  tx: Prisma.TransactionClient,
  userId: string,
  details: NewCardCheckoutDetails,
) => {
  const sanitizedNumber = sanitizeCardNumber(details.cardNumber);
  const payload = {
    cardholderName: details.cardholderName.trim(),
    cardLast4: sanitizedNumber.slice(-4),
    expiryMonth: Number.parseInt(details.expiryMonth.trim(), 10),
    expiryYear: normalizeCheckoutExpiryYear(details.expiryYear),
    cardBrand: details.cardBrand ?? detectCheckoutCardBrand(sanitizedNumber),
    isDefault: details.isDefault ?? false,
    isActive: true,
    deleted: false,
    userId,
  };

  if (payload.isDefault) {
    await tx.savedPaymentCard.updateMany({
      where: { userId, deleted: false, isActive: true },
      data: { isDefault: false },
    });
  } else {
    const existing = await tx.savedPaymentCard.count({
      where: { userId, deleted: false, isActive: true },
    });
    if (existing === 0) {
      payload.isDefault = true;
    }
  }

  return tx.savedPaymentCard.create({
    data: payload,
  });
};

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

  // Sync local cart lines into a persisted cart
  syncCartToDatabase: protectedProcedure
    .input(
      z.object({
        items: z
          .array(
            z.object({
              productId: z.number(),
              quantity: z.number().positive(),
            }),
          )
          .min(1, "Debes agregar productos al carrito"),
        addressId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const products = await ctx.db.product.findMany({
        where: {
          id: { in: input.items.map((item) => item.productId) },
        },
      });

      if (products.length !== input.items.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Algunos productos del carrito ya no existen.",
        });
      }

      const productMap = new Map(
        products.map((product) => [product.id, product]),
      );

      const existingCart = await ctx.db.cart.findFirst({
        where: { userId: ctx.session.user.id, status: CartStatus.DRAFT },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });

      const cart = await ctx.db.$transaction(async (tx) => {
        if (existingCart) {
          await tx.cartItem.deleteMany({ where: { cartId: existingCart.id } });
          return tx.cart.update({
            where: { id: existingCart.id },
            data: {
              addressId: input.addressId ?? existingCart.addressId,
              items: {
                create: input.items.map((item) => {
                  const product = productMap.get(item.productId);
                  if (!product) {
                    throw new TRPCError({
                      code: "BAD_REQUEST",
                      message: `Producto ${item.productId} no encontrado`,
                    });
                  }
                  return {
                    productId: item.productId,
                    quantity: item.quantity,
                    unit: product.customerUnit,
                    price: product.price,
                    publicPrice: product.publicPrice ?? product.price,
                    productSnapshot: JSON.stringify(product),
                  };
                }),
              },
            },
            include: {
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
            },
          });
        }

        return tx.cart.create({
          data: {
            userId: ctx.session.user.id,
            addressId: input.addressId ?? null,
            status: CartStatus.DRAFT,
            items: {
              create: input.items.map((item) => {
                const product = productMap.get(item.productId);
                if (!product) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `Producto ${item.productId} no encontrado`,
                  });
                }
                return {
                  productId: item.productId,
                  quantity: item.quantity,
                  unit: product.customerUnit,
                  price: product.price,
                  publicPrice: product.publicPrice ?? product.price,
                  productSnapshot: JSON.stringify(product),
                };
              }),
            },
          },
          include: {
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
          },
        });
      });

      return cart;
    }),

  processCheckout: protectedProcedure
    .input(
      z.discriminatedUnion("paymentMethod", [
        creditCardCheckoutInputSchema.merge(
          z.object({
            cartId: z.number(),
            addressId: z.number().optional(),
            termsAccepted: z.boolean(),
            newAddress: createAddressSchema.optional(),
          }),
        ),
        wireTransferCheckoutInputSchema.merge(
          z.object({
            cartId: z.number(),
            addressId: z.number().optional(),
            termsAccepted: z.boolean(),
            newAddress: createAddressSchema.optional(),
          }),
        ),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.termsAccepted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debes aceptar los términos y condiciones.",
        });
      }

      const cart = await ctx.db.cart.findUnique({
        where: { id: input.cartId },
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
          userPayments: true,
        },
      });

      if (!cart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Carrito no encontrado",
        });
      }

      if (cart.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permiso para operar sobre este carrito.",
        });
      }

      if (!cart.items.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El carrito está vacío.",
        });
      }

      if (!validateMoq(cart.items)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El carrito no cumple los requisitos de MOQ por ahora.",
        });
      }

      const resolvedAddressId = input.addressId ?? cart.addressId;
      if (!resolvedAddressId && !input.newAddress) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debes seleccionar o crear una dirección de entrega.",
        });
      }

      const totalAmount = calculateCartTotal(cart.items);
      const paymentTrackingId = generateTrackingId();
      const paymentService = new CreditCardPaymentService();
      const isCreditCard = input.paymentMethod === "credit_card";

      const transactionResult = await ctx.db.$transaction(
        async (tx) => {
          let addressId = resolvedAddressId;

          if (!addressId && input.newAddress) {
            const newAddress = await tx.address.create({
              data: {
                ...input.newAddress,
                userId: ctx.session.user.id,
                supplierId: null,
                carrierId: null,
                isActive: true,
              },
            });
            addressId = newAddress.id;
          }

          if (!addressId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No se pudo resolver la dirección de entrega.",
            });
          }

          let chargePayload: CreditCardPayload | null = null;
          let cardToPersist: NewCardCheckoutDetails | null = null;
          let usedSavedCardId: number | null = null;

          if (isCreditCard) {
            const paymentDetails = input.paymentDetails;
            if (paymentDetails.useSavedCard) {
              const savedCard = await tx.savedPaymentCard.findFirst({
                where: {
                  id: paymentDetails.savedPaymentCardId,
                  userId: ctx.session.user.id,
                  deleted: false,
                  isActive: true,
                },
              });

              if (!savedCard) {
                throw new TRPCError({
                  code: "NOT_FOUND",
                  message: "La tarjeta seleccionada no está disponible.",
                });
              }

              chargePayload = buildChargePayloadFromSavedCard(savedCard);
              usedSavedCardId = savedCard.id;
            } else {
              chargePayload = buildChargePayloadFromNewCard(paymentDetails);
              if (paymentDetails.saveCard) {
                cardToPersist = paymentDetails;
              }
            }
          }

          if (isCreditCard && !chargePayload) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Faltan datos de pago.",
            });
          }

          const paymentResult =
            isCreditCard && chargePayload
              ? await paymentService.charge(totalAmount, chargePayload)
              : {
                  transactionId: generateTransactionId(),
                  status: PaymentStatus.COMPLETED,
                  processedAt: new Date(),
                  authorizationCode: "WIRE-TRANSFER",
                  cardLast4: "WIRE",
                };

          const savedCard =
            cardToPersist && paymentResult.status !== PaymentStatus.FAILED
              ? await persistPaymentCard(tx, ctx.session.user.id, cardToPersist)
              : null;

          const payment = await tx.userPayment.create({
            data: {
              cartId: cart.id,
              amount: totalAmount,
              status: paymentResult.status,
              transaction: {
                id: paymentResult.transactionId,
                processedAt: paymentResult.processedAt.toISOString(),
                authorization: paymentResult.authorizationCode,
                method: input.paymentMethod,
                cardLast4: paymentResult.cardLast4,
                trackingId: paymentTrackingId,
                savedPaymentCardId:
                  savedCard?.id ?? usedSavedCardId ?? undefined,
              },
            },
          });

          if (paymentResult.status === PaymentStatus.FAILED) {
            await tx.cart.update({
              where: { id: cart.id },
              data: { status: CartStatus.PAYMENT_FAILED, addressId },
            });
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "El pago fue rechazado. Intenta nuevamente.",
            });
          }

          const paidCart = await tx.cart.update({
            where: { id: cart.id },
            data: {
              status: CartStatus.COMPLETED,
              paidAt: new Date(),
              addressId,
            },
            include: {
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
              address: true,
              userPayments: true,
            },
          });

          return {
            payment,
            paidCart,
            trackingId: paymentTrackingId,
            transactionId: paymentResult.transactionId,
          };
        },
        { timeout: 10000 },
      );

      const { paidCart, payment, trackingId, transactionId } =
        transactionResult;

      type CartItem = (typeof paidCart.items)[number];
      const itemsBySupplier = paidCart.items.reduce<Record<number, CartItem[]>>(
        (acc, item) => {
          const supplierId = item.product.supplierId;
          if (!acc[supplierId]) {
            acc[supplierId] = [];
          }
          acc[supplierId]?.push(item);
          return acc;
        },
        {},
      );

      const supplierIds = Object.keys(itemsBySupplier).map((id) =>
        Number.parseInt(id, 10),
      );

      const existingPendingLots = supplierIds.length
        ? await ctx.db.lot.findMany({
            where: {
              supplierId: { in: supplierIds },
              status: LotStatus.PENDING,
            },
            include: {
              supplier: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          })
        : [];

      const pendingLotMap = new Map(
        existingPendingLots.map((lot) => [lot.supplierId, lot]),
      );

      const lots: Array<Awaited<ReturnType<typeof ctx.db.lot.create>>> = [];

      for (const [supplierId, supplierItems] of Object.entries(
        itemsBySupplier,
      )) {
        const supplierIdNum = Number.parseInt(supplierId, 10);
        const existingLot = pendingLotMap.get(supplierIdNum);

        if (existingLot) {
          const lot = await ctx.db.lot.update({
            where: { id: existingLot.id },
            data: {
              items: {
                connect: supplierItems.map((item) => ({ id: item.id })),
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
          pendingLotMap.set(supplierIdNum, lot);
          lots.push(lot);
        } else {
          const lot = await ctx.db.lot.create({
            data: {
              trackingNumber: generateTrackingId(),
              status: LotStatus.PENDING,
              scheduledAt: new Date(),
              supplierId: supplierIdNum,
              items: {
                connect: supplierItems.map((item) => ({ id: item.id })),
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
          pendingLotMap.set(supplierIdNum, lot);
          lots.push(lot);
        }
      }

      const eta = calculateEtaDate();

      const cartWithLots = await ctx.db.cart.findUnique({
        where: { id: paidCart.id },
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
              lot: true,
            },
          },
          userPayments: true,
        },
      });

      if (!cartWithLots) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo obtener el carrito actualizado.",
        });
      }

      return {
        cart: cartWithLots,
        payment,
        lots,
        trackingId,
        transactionId,
        eta,
      };
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
