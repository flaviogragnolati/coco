import { CheckoutResultPanel } from "~/app/(storefront)/checkout/_components/checkout-result-panel";
import type { TutorialFixtures } from "~/features/tutorial/tutorial-fixtures";
import { TutorialTargetSlot } from "../tutorial-target-slot";
import { noop } from "./noop";

export function CheckoutResultScene({
	fixtures,
}: {
	fixtures: TutorialFixtures;
}) {
	return (
		<TutorialTargetSlot id="checkout-result">
			<CheckoutResultPanel onRetry={noop} result={fixtures.paymentResult} />
		</TutorialTargetSlot>
	);
}
