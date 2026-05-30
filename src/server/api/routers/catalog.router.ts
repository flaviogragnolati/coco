import { TRPCError } from "@trpc/server";

import {
	catalogProductDetailInputSchema,
	catalogProductDetailSchema,
	catalogProductListOutputSchema,
} from "~/schemas/catalog.schemas";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import * as catalogService from "~/server/services/catalog/catalog.service";

export const catalogRouter = createTRPCRouter({
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
});
