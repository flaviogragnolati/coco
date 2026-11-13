import type { HomeFeature } from "~/shared/common/home.types";
import { HomeComboCard } from "./home-combo-card";
import { HomeOfferAddButton } from "./home-offer-add-button";
import { HomeOfferCard } from "./home-offer-card";

export function HomeFeatureCard({
	feature,
	isAuthenticated,
	userId,
	size = "default",
}: {
	feature: HomeFeature;
	isAuthenticated: boolean;
	userId: string | null;
	size?: "default" | "hero";
}) {
	if (feature.kind === "combo") {
		return (
			<HomeComboCard
				card={feature.combo}
				isAuthenticated={isAuthenticated}
				size={size}
				userId={userId}
			/>
		);
	}

	return (
		<HomeOfferCard
			action={
				<HomeOfferAddButton
					isAuthenticated={isAuthenticated}
					offer={feature.offer}
					size={size === "hero" ? "default" : "compact"}
					userId={userId}
				/>
			}
			offer={feature.offer}
			size={size}
		/>
	);
}
