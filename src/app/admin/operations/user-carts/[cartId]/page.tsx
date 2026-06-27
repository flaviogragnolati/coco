import { notFound } from "next/navigation";

import { CartTraceabilityClient } from "./_components/cart-traceability-client";

export default async function AdminCartTraceabilityPage({
	params,
}: {
	params: Promise<{ cartId: string }>;
}) {
	const { cartId } = await params;
	const id = Number(cartId);
	if (!Number.isInteger(id) || id <= 0) notFound();

	return <CartTraceabilityClient cartId={id} />;
}
