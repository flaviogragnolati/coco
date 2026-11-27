import { PackageSearchIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import { requireUser } from "~/server/auth/route-guards";
import { loadMyOrders } from "./_components/load-my-orders";
import { MyOrdersRouteShell } from "./_components/my-orders-shell";

/**
 * "Mis pedidos": the list beside the open order. `/my-orders/[orderId]` stays
 * each order's address; the list is a layout, not a modal.
 */
export default async function MyOrdersLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireUser();
	const orders = await loadMyOrders();

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
			<PageHeader eyebrow="Mi cuenta" title="Mis pedidos" tone="storefront" />

			{orders.length === 0 ? (
				<Empty className="border bg-brand-warm text-brand-warm-foreground">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PackageSearchIcon />
						</EmptyMedia>
						<EmptyTitle>Todavía no tenés pedidos</EmptyTitle>
						<EmptyDescription>
							Armá tu pedido para sumarte a la compra de la semana.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild variant="highlight">
							<Link href="/products">Ver productos</Link>
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<MyOrdersRouteShell orders={orders}>{children}</MyOrdersRouteShell>
			)}
		</main>
	);
}
