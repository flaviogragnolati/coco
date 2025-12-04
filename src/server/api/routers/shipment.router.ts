import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { ShipmentStatus, PackageStatus } from "~/prisma-client";

export const shipmentRouter = createTRPCRouter({
  // Get all shipments
  getAll: publicProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(ShipmentStatus).optional(),
          carrierId: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        status?: ShipmentStatus;
        carrierId?: number;
      } = {};

      if (input?.status) where.status = input.status;
      if (input?.carrierId) where.carrierId = input.carrierId;

      return await ctx.db.shipment.findMany({
        where,
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
          packages: {
            include: {
              package: {
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
              },
            },
          },
          shipmentPayments: true,
          _count: {
            select: {
              packages: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Get single shipment by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.shipment.findUnique({
        where: { id: input.id },
        include: {
          carrier: {
            select: {
              id: true,
              name: true,
              description: true,
              phone: true,
              email: true,
              contactName: true,
              contactPhone: true,
              contactEmail: true,
            },
          },
          address: true,
          packages: {
            include: {
              package: {
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
                        include: {
                          product: {
                            select: {
                              id: true,
                              name: true,
                              code: true,
                            },
                          },
                          cart: {
                            select: {
                              id: true,
                              userId: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          shipmentPayments: true,
        },
      });
    }),

  // Create new shipment
  create: publicProcedure
    .input(
      z.object({
        carrierId: z.number(),
        addressId: z.number(),
        eta: z.date().optional(),
        packageIds: z.array(z.number()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get carrier name
      const carrier = await ctx.db.carrier.findUnique({
        where: { id: input.carrierId },
        select: { name: true },
      });

      if (!carrier) {
        throw new Error("Carrier not found");
      }

      // Generate tracking ID
      const shipmentCount = await ctx.db.shipment.count();
      const trackingId = `SHIP-${new Date().getFullYear()}-${String(shipmentCount + 1).padStart(4, "0")}`;

      // Calculate ETA (default 3 days if not provided)
      const eta = input.eta ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      return await ctx.db.shipment.create({
        data: {
          trackingId,
          carrierName: carrier.name,
          status: ShipmentStatus.ASSEMBLING,
          eta,
          carrierId: input.carrierId,
          addressId: input.addressId,
          ...(input.packageIds && {
            packages: {
              create: input.packageIds.map((pkgId) => ({
                package: { connect: { id: pkgId } },
              })),
            },
          }),
        },
        include: {
          carrier: true,
          address: true,
          packages: {
            include: {
              package: {
                include: {
                  lot: {
                    include: {
                      supplier: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }),

  // Assemble shipment from packages
  assembleFromPackages: publicProcedure
    .input(
      z.object({
        carrierId: z.number(),
        addressId: z.number(),
        packageIds: z.array(z.number()),
        eta: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify all packages are READY_FOR_PICKUP
      const packages = await ctx.db.package.findMany({
        where: {
          id: { in: input.packageIds },
        },
        select: {
          id: true,
          status: true,
        },
      });

      const notReadyPackages = packages.filter(
        (pkg) => pkg.status !== PackageStatus.READY_FOR_PICKUP,
      );

      if (notReadyPackages.length > 0) {
        throw new Error(
          `Packages ${notReadyPackages.map((p) => p.id).join(", ")} are not ready for pickup`,
        );
      }

      // Get carrier name
      const carrier = await ctx.db.carrier.findUnique({
        where: { id: input.carrierId },
        select: { name: true },
      });

      if (!carrier) {
        throw new Error("Carrier not found");
      }

      // Generate tracking ID
      const shipmentCount = await ctx.db.shipment.count();
      const trackingId = `SHIP-${new Date().getFullYear()}-${String(shipmentCount + 1).padStart(4, "0")}`;

      // Calculate ETA (default 3 days if not provided)
      const eta = input.eta ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      // Create shipment
      const shipment = await ctx.db.shipment.create({
        data: {
          trackingId,
          carrierName: carrier.name,
          status: ShipmentStatus.ASSEMBLING,
          eta,
          carrierId: input.carrierId,
          addressId: input.addressId,
          packages: {
            create: input.packageIds.map((pkgId) => ({
              package: { connect: { id: pkgId } },
            })),
          },
        },
        include: {
          carrier: true,
          address: true,
          packages: {
            include: {
              package: {
                include: {
                  lot: {
                    include: {
                      supplier: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return shipment;
    }),

  // Update shipment status
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.nativeEnum(ShipmentStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: {
        status: ShipmentStatus;
        startedAt?: Date;
        arrivedAt?: Date;
      } = {
        status: input.status,
      };

      // Set timestamps based on status
      if (input.status === ShipmentStatus.IN_TRANSIT) {
        updateData.startedAt = new Date();
      }
      if (
        input.status === ShipmentStatus.ARRIVED ||
        input.status === ShipmentStatus.CLOSED
      ) {
        updateData.arrivedAt = new Date();
      }

      // If moving to IN_TRANSIT, update all packages to IN_TRANSIT
      if (input.status === ShipmentStatus.IN_TRANSIT) {
        const shipment = await ctx.db.shipment.findUnique({
          where: { id: input.id },
          include: {
            packages: {
              include: {
                package: true,
              },
            },
          },
        });

        if (shipment) {
          await ctx.db.package.updateMany({
            where: {
              id: {
                in: shipment.packages.map((sp) => sp.package.id),
              },
            },
            data: {
              status: PackageStatus.IN_TRANSIT,
            },
          });
        }
      }

      // If moving to ARRIVED or CLOSED, update all packages to DELIVERED
      if (
        input.status === ShipmentStatus.ARRIVED ||
        input.status === ShipmentStatus.CLOSED
      ) {
        const shipment = await ctx.db.shipment.findUnique({
          where: { id: input.id },
          include: {
            packages: {
              include: {
                package: true,
              },
            },
          },
        });

        if (shipment) {
          await ctx.db.package.updateMany({
            where: {
              id: {
                in: shipment.packages.map((sp) => sp.package.id),
              },
            },
            data: {
              status: PackageStatus.DELIVERED,
            },
          });
        }
      }

      return await ctx.db.shipment.update({
        where: { id: input.id },
        data: updateData,
        include: {
          carrier: true,
          address: true,
          packages: {
            include: {
              package: {
                include: {
                  lot: true,
                },
              },
            },
          },
        },
      });
    }),

  // Start shipment (mark as in transit)
  start: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get shipment to update package statuses
      const shipment = await ctx.db.shipment.findUnique({
        where: { id: input.id },
        include: {
          packages: {
            include: {
              package: true,
            },
          },
        },
      });

      if (!shipment) {
        throw new Error("Shipment not found");
      }

      // Update all packages to IN_TRANSIT
      await ctx.db.package.updateMany({
        where: {
          id: {
            in: shipment.packages.map((sp) => sp.package.id),
          },
        },
        data: {
          status: PackageStatus.IN_TRANSIT,
        },
      });

      return await ctx.db.shipment.update({
        where: { id: input.id },
        data: {
          status: ShipmentStatus.IN_TRANSIT,
          startedAt: new Date(),
        },
        include: {
          carrier: true,
          address: true,
          packages: {
            include: {
              package: true,
            },
          },
        },
      });
    }),

  // Mark shipment as arrived
  markArrived: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get shipment to update package statuses
      const shipment = await ctx.db.shipment.findUnique({
        where: { id: input.id },
        include: {
          packages: {
            include: {
              package: true,
            },
          },
        },
      });

      if (!shipment) {
        throw new Error("Shipment not found");
      }

      // Update all packages to DELIVERED
      await ctx.db.package.updateMany({
        where: {
          id: {
            in: shipment.packages.map((sp) => sp.package.id),
          },
        },
        data: {
          status: PackageStatus.DELIVERED,
        },
      });

      return await ctx.db.shipment.update({
        where: { id: input.id },
        data: {
          status: ShipmentStatus.ARRIVED,
          arrivedAt: new Date(),
        },
        include: {
          carrier: true,
          address: true,
          packages: {
            include: {
              package: true,
            },
          },
        },
      });
    }),

  // Close shipment
  close: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.shipment.update({
        where: { id: input.id },
        data: {
          status: ShipmentStatus.CLOSED,
        },
        include: {
          carrier: true,
          address: true,
          packages: {
            include: {
              package: true,
            },
          },
        },
      });
    }),

  // Add packages to shipment
  addPackages: publicProcedure
    .input(
      z.object({
        id: z.number(),
        packageIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.shipment.update({
        where: { id: input.id },
        data: {
          packages: {
            create: input.packageIds.map((pkgId) => ({
              package: { connect: { id: pkgId } },
            })),
          },
        },
        include: {
          packages: {
            include: {
              package: {
                include: {
                  lot: true,
                },
              },
            },
          },
        },
      });
    }),

  // Delete shipment
  delete: publicProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.shipment.delete({
        where: { id: input.id },
      });
    }),
});
