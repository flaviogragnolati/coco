import { orderArrivalBanner } from "~/app/(storefront)/my-orders/_components/order-arrival";
import { OrderDetailView } from "~/app/(storefront)/my-orders/[orderId]/_components/order-detail-view";
import type { TutorialFixtures } from "~/features/tutorial/tutorial-fixtures";
import {
	type TutorialJourneyPoint,
	tutorialTarget,
} from "~/features/tutorial/tutorial-script";
import { selectOrderDisplayAttempt } from "~/shared/common/order-display";

/** Mirrors the order column of `/my-orders/[orderId]` around the real view. */
export function OrderDetailScene({
	journey,
	arrival,
	fixtures,
}: {
	journey: TutorialJourneyPoint;
	arrival?: "mp";
	fixtures: TutorialFixtures;
}) {
	const { order, journeyItems } = fixtures.orderDetail(journey);
	const attempt = selectOrderDisplayAttempt(order.transactions);
	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-6">
			<OrderDetailView
				arrivalBanner={orderArrivalBanner({
					arrival: arrival ?? null,
					attempt: attempt
						? { provider: attempt.provider, status: attempt.status }
						: null,
				})}
				journeyItems={journeyItems}
				order={order}
				targets={{
					journey: tutorialTarget("order-journey"),
					arrival: tutorialTarget("order-arrival"),
				}}
			/>
		</main>
	);
}
