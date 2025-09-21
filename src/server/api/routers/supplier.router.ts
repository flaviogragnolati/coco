import { db } from "~/server/db";
import { z } from "zod";

import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { mockSuppliers } from "~/mock/suppliers";
import { createSupplierSchema, updateSupplierSchema } from "~/schema/supplier";

export const supplierRouter = createTRPCRouter({
	getAllSuppliers: publicProcedure.query(async ({ ctx }) => {
		try {
			const suppliers = await ctx.db.supplier.findMany({
				where: { deleted: false },
				select: {
					id: true,
					name: true,
					description: true,
					image: true,
					phone: true,
					email: true,
					website: true,
					taxId: true,
					taxType: true,
					isActive: true,
					deleted: true,
					createdAt: true,
					updatedAt: true,
					_count: {
						select: {
							products: true,
							addresses: true,
						},
					},
				},
				orderBy: [{ isActive: "desc" }, { name: "asc" }],
			});

			if (suppliers.length > 0) return suppliers;

			return mockSuppliers;
		} catch (error) {
			console.error("Failed to fetch suppliers from database:", error);
			return mockSuppliers;
		}
	}),

	createSupplier: protectedProcedure
		.input(createSupplierSchema)
		.mutation(async ({ input, ctx }) => {
			return await ctx.db.supplier.create({
				data: input,
				select: {
					id: true,
					name: true,
					description: true,
					image: true,
					phone: true,
					email: true,
					website: true,
					taxId: true,
					taxType: true,
					isActive: true,
					createdAt: true,
					updatedAt: true,
				},
			});
		}),

	updateSupplier: protectedProcedure
		.input(updateSupplierSchema)
		.mutation(async ({ input, ctx }) => {
			const { id, ...updateData } = input;
			return await ctx.db.supplier.update({
				where: { id },
				data: updateData,
				select: {
					id: true,
					name: true,
					description: true,
					image: true,
					phone: true,
					email: true,
					website: true,
					taxId: true,
					taxType: true,
					isActive: true,
					createdAt: true,
					updatedAt: true,
				},
			});
		}),
});
