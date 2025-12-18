import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const productRouter = createTRPCRouter({
  getAllProducts: publicProcedure.query(async ({ ctx }) => {
    const products = await ctx.db.product.findMany({
      where: { deleted: false },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      tags: product.publicTags ?? [],
      price: product.price,
      currency: product.currency ?? "ARS",
      code: product.code,
      supplierCode: product.supplierCode,
      supplierUrl: product.supplierUrl,
      images: product.images ?? [],
      priceUnit: product.priceUnit,
      customerMoq: product.customerMoq,
      customerUnit: product.customerUnit,
      customerUnitMultiplier: product.customerUnitMultiplier,
      supplierMoq: product.supplierMoq,
      supplierUnit: product.supplierUnit,
      minFractionPerUser: product.minFractionPerUser,
      publicPrice: product.publicPrice,
      publicPriceUnit: product.publicPriceUnit,
      publicPriceMultiplier: product.publicPriceMultiplier,
      supplier: {
        id: product.supplier.id,
        name: product.supplier.name,
        image: product.supplier.image,
      },
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
          }
        : null,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));
  }),
});
