import { MyOrdersClient } from "~/app/(storefront)/my-orders/_components/my-orders-client";
import { PageHeader } from "~/components/page-header";
import type { TutorialFixtures } from "~/features/tutorial/tutorial-fixtures";
import { TutorialTargetSlot } from "../tutorial-target-slot";

/** Mirrors the `/my-orders` page shell around the real list. */
export function MyOrdersScene({ fixtures }: { fixtures: TutorialFixtures }) {
	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
			<PageHeader
				description="Seguí el estado de cada pedido y su recorrido hasta la entrega."
				eyebrow="Mi cuenta"
				title="Mis pedidos"
				tone="storefront"
			/>
			<TutorialTargetSlot id="my-orders-list">
				<MyOrdersClient orders={fixtures.orderList} />
			</TutorialTargetSlot>
		</main>
	);
}
