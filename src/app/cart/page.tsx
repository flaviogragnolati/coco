import type { Metadata } from "next";

import { CartClient } from "~/app/cart/_components/cart-client";
import { getSession } from "~/server/better-auth/server";

export const metadata: Metadata = {
	title: "Carrito | Coco",
	description:
		"Revisa tus productos, cantidades y resumen antes de iniciar checkout.",
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
