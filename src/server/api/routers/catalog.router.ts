import { TRPCError } from "@trpc/server";

import {
	catalogCategoryListOutputSchema,
	catalogProductDetailInputSchema,
	catalogProductDetailSchema,
	catalogProductListOutputSchema,
	transferDiscountSchema,
} from "~/schemas/catalog.schemas";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import * as catalogService from "~/server/services/catalog/catalog.service";

export const catalogRouter = createTRPCRouter({
	categories: publicProcedure
		.output(catalogCategoryListOutputSchema)
		.query(() => catalogService.categories()),

	list: publicProcedure.output(catalogProductListOutputSchema).query(() => {
		return catalogService.list();
	}),

	getProductDetail: publicProcedure
		.input(catalogProductDetailInputSchema)
		.output(catalogProductDetailSchema)
		.query(async ({ input }) => {
			const product = await catalogService.getProductDetail(input.id);

			if (!product) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Producto no encontrado",
				});
			}

			return product;
		}),

	/** Only the percent, and only while the external provider is enabled (ADR 0013). */
	transferDiscount: publicProcedure
		.output(transferDiscountSchema)
		.query(() => catalogService.getTransferDiscount()),
});
