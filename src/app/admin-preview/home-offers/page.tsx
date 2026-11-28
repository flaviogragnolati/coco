import type { Metadata } from "next";

import { FeaturedSection } from "~/features/home/_components/featured-section";
import { HomeSpotlightBand } from "~/features/home/_components/home-spotlight-band";
import { requireAdmin } from "~/server/auth/route-guards";
import { getHomeContent } from "~/server/services/home/home.service";
import { PreviewHeightReporter } from "./_components/preview-height-reporter";

export const metadata: Metadata = {
	title: "Vista previa de destacados",
	robots: { index: false, follow: false },
};

// Lives outside /admin so the iframe gets the storefront layout alone, not the
// admin shell; that also means this page has to guard itself.
export default async function HomeOffersPreviewPage() {
	await requireAdmin();
	const { spotlight, featured } = await getHomeContent();
	// Signed out on purpose: a second guard behind inert, since signed-out cart
	// actions never call the server cart.
	const cartProps = { isAuthenticated: false, userId: null };

	return (
		<div className="font-sans" data-storefront="">
			{/* Read-only: inert blocks the purchase buttons so the preview never
			    writes to the admin's own cart. */}
			<main className="flex flex-col" inert>
				{spotlight ? (
					<HomeSpotlightBand feature={spotlight} {...cartProps} />
				) : null}
				<FeaturedSection featured={featured} {...cartProps} />
			</main>
			<PreviewHeightReporter />
		</div>
	);
}
