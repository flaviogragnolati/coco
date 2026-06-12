import { TrackingClient } from "./_components/tracking-client";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export default async function AdminOperationsTrackingPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const params = await searchParams;

	return (
		<TrackingClient
			initialFilters={{
				cartId: firstParam(params.cartId) ?? "",
				cartItemId: firstParam(params.cartItemId) ?? "",
				orderId: firstParam(params.orderId) ?? "",
				operationId: firstParam(params.operationId) ?? "",
				lotId: firstParam(params.lotId) ?? "",
				lotItemId: firstParam(params.lotItemId) ?? "",
				packageId: firstParam(params.packageId) ?? "",
				shipmentId: firstParam(params.shipmentId) ?? "",
				rollOverId: firstParam(params.rollOverId) ?? "",
			}}
		/>
	);
}
