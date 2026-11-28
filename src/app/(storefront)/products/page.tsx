import type { Metadata } from "next";

import { ProductsClient } from "~/app/(storefront)/products/_components/products-client";
import { getSession } from "~/server/better-auth/server";

export const metadata: Metadata = {
	title: "Productos | CoCo",
	description: "Explorá productos y armá tu pedido de la semana.",
};

/**
 * No server prefetch on purpose. `ProductsClient` reads the catalog with
 * `useQuery`, which does not suspend: a prefetch streamed while still pending
 * rendered "0 productos" on the server and the whole list on any client the
 * data reached first, a hydration mismatch. Awaiting it instead would hold
 * every filter, page and product detail on the database, because each one is a
 * URL change that re-runs this page. So both renders start on the skeleton
 * and the client fetches the catalog once it mounts.
 */
export default async function ProductsPage() {
	const session = await getSession();

	return (
		<ProductsClient
			isAuthenticated={Boolean(session?.user)}
			userId={session?.user.id ?? null}
		/>
	);
}
