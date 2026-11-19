import type { Metadata } from "next";

import { ProductsClient } from "~/app/(storefront)/products/_components/products-client";
import { getSession } from "~/server/better-auth/server";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
	title: "Productos | CoCo",
	description: "Explorá productos y armá tu pedido de la semana.",
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
