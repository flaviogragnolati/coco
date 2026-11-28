/** The admin-only page that renders the home's band and section on their own. */
export const HOME_OFFERS_PREVIEW_PATH = "/admin-preview/home-offers";

/** Posted by the preview to the admin page that frames it. */
export const HOME_OFFERS_PREVIEW_HEIGHT_MESSAGE =
	"coco:home-offers-preview-height";

export type HomeOffersPreviewHeightMessage = {
	type: typeof HOME_OFFERS_PREVIEW_HEIGHT_MESSAGE;
	height: number;
};

export function isPreviewHeightMessage(
	data: unknown,
): data is HomeOffersPreviewHeightMessage {
	if (typeof data !== "object" || data === null) return false;
	const message = data as Partial<HomeOffersPreviewHeightMessage>;
	return (
		message.type === HOME_OFFERS_PREVIEW_HEIGHT_MESSAGE &&
		typeof message.height === "number" &&
		Number.isFinite(message.height) &&
		message.height >= 0
	);
}
