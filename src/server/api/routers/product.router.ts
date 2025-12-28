import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createProductSchema, updateProductSchema } from "~/schema/product";

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
      priceUnit: product.priceUnit,
      priceUnitMultiplier: product.priceUnitMultiplier,
      publicPrice: product.publicPrice,
      publicPriceUnit: product.publicPriceUnit,
      publicPriceMultiplier: product.publicPriceMultiplier,
      supplierMoq: product.supplierMoq,
      supplierUnit: product.supplierUnit,
      supplierUnitMultiplier: product.supplierUnitMultiplier,
      customerMoq: product.customerMoq,
      customerUnit: product.customerUnit,
      customerUnitMultiplier: product.customerUnitMultiplier,
      currency: product.currency ?? "ARS",
      sku: product.code,
      supplierSku: product.supplierCode,
      code: product.code,
      supplierUrl: product.supplierUrl,
      images: product.images ?? [],
      minFractionPerUser: product.minFractionPerUser,
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

  createProduct: publicProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      const { categoryId, categorySlug, mainImage, additionalImages, ...data } =
        input;

      const images = [mainImage, ...(additionalImages ?? [])].filter(
        (img): img is string => Boolean(img),
      );

      const product = await ctx.db.product.create({
        data: {
          name: data.name,
          description: data.description,
          publicTags: data.tags,
          searchTags: data.tags,
          price: data.price,
          priceUnit: data.priceUnit,
          priceUnitMultiplier: data.priceUnitMultiplier,
          publicPrice: data.publicPrice,
          publicPriceUnit: data.publicPriceUnit,
          publicPriceMultiplier: data.publicPriceMultiplier,
          supplierMoq: data.supplierMoq,
          supplierUnit: data.supplierUnit,
          supplierUnitMultiplier: data.supplierUnitMultiplier,
          customerMoq: data.customerMoq,
          customerUnit: data.customerUnit,
          customerUnitMultiplier: data.customerUnitMultiplier,
          currency: data.currency as "USD" | "EUR" | "ARS",
          code: data.code ?? data.sku ?? "",
          supplierCode: data.supplierSku,
          images,
          isActive: data.isActive,
          supplierId: data.supplierId,
          categoryId: categoryId ?? undefined,
        },
      });

      return product;
    }),

  updateProduct: publicProcedure
    .input(updateProductSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        id,
        categoryId,
        categorySlug,
        mainImage,
        additionalImages,
        ...data
      } = input;

      const images = [mainImage, ...(additionalImages ?? [])].filter(
        (img): img is string => Boolean(img),
      );

      const product = await ctx.db.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          publicTags: data.tags,
          searchTags: data.tags,
          price: data.price,
          priceUnit: data.priceUnit,
          priceUnitMultiplier: data.priceUnitMultiplier,
          publicPrice: data.publicPrice,
          publicPriceUnit: data.publicPriceUnit,
          publicPriceMultiplier: data.publicPriceMultiplier,
          supplierMoq: data.supplierMoq,
          supplierUnit: data.supplierUnit,
          supplierUnitMultiplier: data.supplierUnitMultiplier,
          customerMoq: data.customerMoq,
          customerUnit: data.customerUnit,
          customerUnitMultiplier: data.customerUnitMultiplier,
          currency: data.currency as "USD" | "EUR" | "ARS",
          code: data.code ?? data.sku ?? "",
          supplierCode: data.supplierSku,
          images,
          isActive: data.isActive,
          supplierId: data.supplierId,
          categoryId: categoryId ?? undefined,
        },
      });

      return product;
    }),

  deleteProduct: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.update({
        where: { id: input.id },
        data: { deleted: true },
      });

      return product;
    }),
});
