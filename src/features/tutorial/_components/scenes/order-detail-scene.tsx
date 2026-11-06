import { OrderDetailView } from "~/app/(storefront)/my-orders/[orderId]/_components/order-detail-view";
import type { TutorialFixtures } from "~/features/tutorial/tutorial-fixtures";
import {
	type TutorialJourneyPoint,
	tutorialTarget,
} from "~/features/tutorial/tutorial-script";

export function OrderDetailScene({
	journey,
	fixtures,
}: {
	journey: TutorialJourneyPoint;
	fixtures: TutorialFixtures;
}) {
	const { order, journeyView } = fixtures.orderDetail(journey);
	return (
		<OrderDetailView
			journeyView={journeyView}
			order={order}
			targets={{ journey: tutorialTarget("order-journey") }}
		/>
	);
}
