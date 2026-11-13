import { describe, expect, it, vi } from "vitest";

import { productUpdateInputSchema } from "~/schemas/admin/product.schemas";
import { updateProduct } from "./product.data";

describe("updateProduct", () => {
	it("clears the description when the admin empties it", async () => {
		const update = vi.fn().mockResolvedValue({});
		const db = { product: { update } };
		const input = productUpdateInputSchema.parse({
			id: 5,
			name: "Yerba",
			description: "   ",
			images: [],
			unit: "kg",
			brandAssignment: { mode: "none" },
			categoryId: 1,
			active: true,
		});

		await updateProduct(db as never, {
			id: input.id,
			name: input.name,
			description: input.description,
			images: input.images,
			unit: input.unit,
			categoryId: input.categoryId,
			active: input.active,
		});

		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ description: null }),
			}),
		);
	});
});
