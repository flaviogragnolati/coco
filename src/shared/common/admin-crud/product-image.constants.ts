// Uploads pass through a Vercel Function, whose request body caps at 4.5 MB.
export const PRODUCT_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export const PRODUCT_IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;
