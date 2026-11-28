import { MyOrdersShell } from "~/app/(storefront)/my-orders/_components/my-orders-shell";
import { OrderListPane } from "~/app/(storefront)/my-orders/_components/order-list-pane";
import { OrderDetailView } from "~/app/(storefront)/my-orders/[orderId]/_components/order-detail-view";
import { PageHeader } from "~/components/page-header";
import type { TutorialFixtures } from "~/features/tutorial/tutorial-fixtures";
import { TutorialTargetSlot } from "../tutorial-target-slot";

/**
 * Mirrors the `/my-orders` layout: the real list beside the newest order. On a
 * phone the shell shows only the list, as the real page does.
 */
export function MyOrdersScene({ fixtures }: { fixtures: TutorialFixtures }) {
	const { order, journeyItems } = fixtures.orderDetail("submitted");
	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
			<PageHeader eyebrow="Mi cuenta" title="Mis pedidos" tone="storefront" />
			<MyOrdersShell
				detail={<OrderDetailView journeyItems={journeyItems} order={order} />}
				detailOpen={false}
				list={
					<TutorialTargetSlot id="my-orders-list">
						<OrderListPane orders={fixtures.orderList} selectedId={order.id} />
					</TutorialTargetSlot>
				}
			/>
		</main>
	);
}
