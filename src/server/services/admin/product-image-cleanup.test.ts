import { describe, expect, it } from "vitest";
import {
	type ProductImageFields,
	productImageUrlsToDelete,
} from "./product-image-cleanup";

const BLOB = "https://abc123.public.blob.vercel-storage.com";

function images(overrides: Partial<ProductImageFields> = {}) {
	return {
		cardImageUrl: null,
		cartImageUrl: null,
		images: [],
		...overrides,
	};
}

describe("productImageUrlsToDelete", () => {
	it("deletes a replaced card image", () => {
		expect(
			productImageUrlsToDelete({
				before: images({ cardImageUrl: `${BLOB}/products/old.png` }),
				after: images({ cardImageUrl: `${BLOB}/products/new.png` }),
			}),
		).toEqual([`${BLOB}/products/old.png`]);
	});

	it("deletes a gallery image the admin removed and keeps the rest", () => {
		expect(
			productImageUrlsToDelete({
				before: images({
					images: [`${BLOB}/products/a.png`, `${BLOB}/products/b.png`],
				}),
				after: images({ images: [`${BLOB}/products/b.png`] }),
			}),
		).toEqual([`${BLOB}/products/a.png`]);
	});

	it("keeps an image that moved to another field of the same product", () => {
		expect(
			productImageUrlsToDelete({
				before: images({ cardImageUrl: `${BLOB}/products/a.png` }),
				after: images({ images: [`${BLOB}/products/a.png`] }),
			}),
		).toEqual([]);
	});

	it("deletes every uploaded image of a hard-deleted product", () => {
		expect(
			productImageUrlsToDelete({
				before: images({
					cardImageUrl: `${BLOB}/products/card.png`,
					cartImageUrl: `${BLOB}/products/cart.png`,
					images: [`${BLOB}/products/gallery.png`],
				}),
				after: null,
			}),
		).toEqual([
			`${BLOB}/products/card.png`,
			`${BLOB}/products/cart.png`,
			`${BLOB}/products/gallery.png`,
		]);
	});

	it("never deletes external URLs pasted by hand", () => {
		expect(
			productImageUrlsToDelete({
				before: images({
					cardImageUrl: "https://cdn.example.com/products/a.png",
					cartImageUrl: `http://abc123.public.blob.vercel-storage.com/products/b.png`,
					images: [
						`https://example.com/?u=${BLOB}/products/c.png`,
						"not a url",
					],
				}),
				after: null,
			}),
		).toEqual([]);
	});

	it("ignores blobs outside the products/ path", () => {
		expect(
			productImageUrlsToDelete({
				before: images({
					cardImageUrl: `${BLOB}/qa-evidence/a.png`,
					cartImageUrl: `${BLOB}/other/products/b.png`,
				}),
				after: null,
			}),
		).toEqual([]);
	});

	it("keeps an image still used by another product", () => {
		expect(
			productImageUrlsToDelete({
				before: images({
					cardImageUrl: `${BLOB}/products/shared.png`,
					images: [`${BLOB}/products/own.png`],
				}),
				after: null,
				otherProducts: [images({ images: [`${BLOB}/products/shared.png`] })],
			}),
		).toEqual([`${BLOB}/products/own.png`]);
	});

	it("returns each URL once when the product used it in several fields", () => {
		expect(
			productImageUrlsToDelete({
				before: images({
					cardImageUrl: `${BLOB}/products/a.png`,
					cartImageUrl: `${BLOB}/products/a.png`,
					images: [`${BLOB}/products/a.png`, `${BLOB}/products/a.png`],
				}),
				after: images(),
			}),
		).toEqual([`${BLOB}/products/a.png`]);
	});
});
