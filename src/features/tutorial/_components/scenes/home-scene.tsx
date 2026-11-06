import { HomeHero } from "~/features/home/_components/home-hero";
import { HowItWorksSection } from "~/features/home/_components/how-it-works-section";
import { TutorialTargetSlot } from "../tutorial-target-slot";

export function HomeScene() {
	return (
		<main className="flex min-h-screen flex-col">
			<HomeHero hasOffers={false} />
			<TutorialTargetSlot id="home-how-it-works">
				<HowItWorksSection />
			</TutorialTargetSlot>
		</main>
	);
}
