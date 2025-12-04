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
      tags: product.tags ?? [],
      price: product.price,
      currency: "ARS",
      sku: product.code ?? null,
      supplierSku: product.code ?? null,
      code: product.code ?? null,
      images: product.image ?? [],
      moq: product.moq,
      unit: product.unit,
      step: product.step,
      minQuantity: product.minQty ?? undefined,
      maxQuantity: product.maxQty ?? undefined,
      bundleSize: product.originalQty ?? undefined,
      bundleUnit: product.unit ?? undefined,
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
