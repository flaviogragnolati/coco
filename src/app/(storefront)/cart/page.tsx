import type { Metadata } from "next";

import { CartClient } from "~/app/(storefront)/cart/_components/cart-client";
import { getSession } from "~/server/better-auth/server";

export const metadata: Metadata = {
	title: "Tu pedido | CoCo",
	description:
		"Revisá tus productos, elegí cómo lo recibís y cómo pagás, y confirmá tu pedido.",
};

export default async function CartPage() {
	const session = await getSession();

	return (
		<CartClient
			isAuthenticated={Boolean(session?.user)}
			userId={session?.user.id ?? null}
		/>
	);
}
