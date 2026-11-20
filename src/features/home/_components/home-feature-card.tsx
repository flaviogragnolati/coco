import type { ReactNode } from "react";
import type { HomeFeature } from "~/shared/common/home.types";
import { HomeComboCard } from "./home-combo-card";
import { HomeOfferAddButton } from "./home-offer-add-button";
import { HomeOfferCard } from "./home-offer-card";
import { HomeOfferCompactPurchase } from "./home-offer-compact-purchase";
import {
	HomeOfferPurchasePanel,
	HomeOfferQuantityProvider,
} from "./home-offer-quantity";

export function HomeFeatureCard({
	feature,
	isAuthenticated,
	userId,
	size = "default",
	intro,
}: {
	feature: HomeFeature;
	isAuthenticated: boolean;
	userId: string | null;
	size?: "default" | "hero";
	/** Shown over the title of a `hero` card. */
	intro?: ReactNode;
}) {
	if (feature.kind === "combo") {
		return (
			<HomeComboCard
				card={feature.combo}
				intro={intro}
				isAuthenticated={isAuthenticated}
				size={size}
				userId={userId}
			/>
		);
	}

	const { offer } = feature;
	return (
		<HomeOfferCard intro={intro} offer={offer} size={size}>
			{size === "hero" ? (
				<HomeOfferQuantityProvider offer={offer}>
					<HomeOfferPurchasePanel
						action={
							<HomeOfferAddButton
								isAuthenticated={isAuthenticated}
								offer={offer}
								userId={userId}
							/>
						}
						offer={offer}
						size="hero"
					/>
				</HomeOfferQuantityProvider>
			) : (
				<HomeOfferCompactPurchase
					isAuthenticated={isAuthenticated}
					offer={offer}
					userId={userId}
				/>
			)}
		</HomeOfferCard>
	);
}
