import { OrderDetailView } from "~/app/(storefront)/my-orders/[orderId]/_components/order-detail-view";
import type { TutorialFixtures } from "~/features/tutorial/tutorial-fixtures";
import {
	type TutorialJourneyPoint,
	tutorialTarget,
} from "~/features/tutorial/tutorial-script";

/** Mirrors the order column of `/my-orders/[orderId]` around the real view. */
export function OrderDetailScene({
	journey,
	fixtures,
}: {
	journey: TutorialJourneyPoint;
	fixtures: TutorialFixtures;
}) {
	const { order, journeyItems } = fixtures.orderDetail(journey);
	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-6">
			<OrderDetailView
				journeyItems={journeyItems}
				order={order}
				targets={{ journey: tutorialTarget("order-journey") }}
			/>
		</main>
	);
}
