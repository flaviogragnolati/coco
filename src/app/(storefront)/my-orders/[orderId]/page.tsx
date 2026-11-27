import { notFound } from "next/navigation";

import { requireUser } from "~/server/auth/route-guards";
import { parseOrderArrival } from "../_components/order-arrival";
import { OrderDetailSection } from "../_components/order-detail-section";

export default async function OrderDetailPage({
	params,
	searchParams,
}: {
	params: Promise<{ orderId: string }>;
	searchParams: Promise<{ llegada?: string | string[] }>;
}) {
	const session = await requireUser();
	const [{ orderId }, { llegada }] = await Promise.all([params, searchParams]);
	const id = Number(orderId);
	if (!Number.isInteger(id) || id <= 0) notFound();

	return (
		<OrderDetailSection
			arrival={parseOrderArrival(llegada)}
			orderId={id}
			userId={session.user.id}
		/>
	);
}
