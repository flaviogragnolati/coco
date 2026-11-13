import { HomeHero } from "~/features/home/_components/home-hero";
import { HowItWorksSection } from "~/features/home/_components/how-it-works-section";
import { tutorialWeeklyClosing } from "~/features/tutorial/tutorial-fixtures";
import { TutorialTargetSlot } from "../tutorial-target-slot";

export function HomeScene() {
	return (
		<main className="flex min-h-screen flex-col">
			<HomeHero schedule={tutorialWeeklyClosing} />
			<TutorialTargetSlot id="home-how-it-works">
				<HowItWorksSection schedule={tutorialWeeklyClosing} />
			</TutorialTargetSlot>
		</main>
	);
}
