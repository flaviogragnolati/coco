export type ProductImageFields = {
	cardImageUrl: string | null;
	cartImageUrl: string | null;
	images: readonly string[];
};

const BLOB_PUBLIC_HOST_SUFFIX = ".public.blob.vercel-storage.com";

function productImageUrls(product: ProductImageFields) {
	return [product.cardImageUrl, product.cartImageUrl, ...product.images].filter(
		(url): url is string => Boolean(url),
	);
}

/** The upload route's Vercel Blob `products/` paths; any other URL was pasted by hand and is never ours to delete. */
function isUploadedProductImageUrl(url: string) {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}
	return (
		parsed.protocol === "https:" &&
		parsed.hostname.endsWith(BLOB_PUBLIC_HOST_SUFFIX) &&
		parsed.pathname.startsWith("/products/")
	);
}

/**
 * Uploaded images the product held before a save and no longer holds, minus any
 * still used by `otherProducts`; `after` is null when the product was hard-deleted.
 */
export function productImageUrlsToDelete({
	before,
	after,
	otherProducts = [],
}: {
	before: ProductImageFields;
	after: ProductImageFields | null;
	otherProducts?: readonly ProductImageFields[];
}) {
	const kept = new Set([
		...(after ? productImageUrls(after) : []),
		...otherProducts.flatMap(productImageUrls),
	]);

	return [
		...new Set(
			productImageUrls(before).filter(
				(url) => !kept.has(url) && isUploadedProductImageUrl(url),
			),
		),
	];
}
