import type { Metadata } from "next";

import { ProductsClient } from "~/app/products/_components/products-client";
import { getSession } from "~/server/better-auth/server";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
	title: "Productos | Coco",
	description:
		"Explora productos mayoristas disponibles y suma cantidades a tu carrito compartido.",
};

export default async function ProductsPage() {
	const session = await getSession();
	void api.catalog.list.prefetch();

	return (
		<HydrateClient>
			<ProductsClient
				isAuthenticated={Boolean(session?.user)}
				userId={session?.user.id ?? null}
			/>
		</HydrateClient>
	);
}
