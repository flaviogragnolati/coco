import { requireUser } from "~/server/auth/route-guards";
import { loadMyOrders } from "./_components/load-my-orders";
import { OrderDetailSection } from "./_components/order-detail-section";

/**
 * Without an order in the URL, the newest one opens beside the list. On a
 * phone the shell shows only the list.
 */
export default async function MyOrdersPage() {
	const session = await requireUser();
	const [latest] = await loadMyOrders();
	if (!latest) return null;

	return (
		<OrderDetailSection
			arrival={null}
			orderId={latest.id}
			userId={session.user.id}
		/>
	);
}
