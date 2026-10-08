/**
 * The product the home puts in the spotlight band, given the grid order
 * (pinned first, then the ranking) restricted to products with current terms.
 * Mirrors `composeHomeContent`: a pick that cannot be shown is skipped and the
 * top of that order takes the band, leaving the grid.
 */
export function resolvePreviewSpotlightId(
	spotlightProductId: number | null,
	gridOrder: ReadonlyArray<{ productId: number }>,
) {
	if (
		gridOrder.some((candidate) => candidate.productId === spotlightProductId)
	) {
		return spotlightProductId;
	}
	return gridOrder[0]?.productId ?? null;
}
