import { PackageSearchIcon } from "lucide-react";
import Link from "next/link";

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
import { api } from "~/trpc/server";
import { MyOrdersClient } from "./_components/my-orders-client";

export default async function MyOrdersPage() {
	await requireUser();
	const orders = await api.orders.listMine();

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
			<PageHeader
				description="Seguí el estado de cada pedido y su recorrido hasta la entrega."
				eyebrow="Mi cuenta"
				title="Mis pedidos"
			/>

			{orders.length === 0 ? (
				<Empty className="border bg-brand-warm text-brand-warm-foreground">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PackageSearchIcon />
						</EmptyMedia>
						<EmptyTitle>Todavía no tenés pedidos</EmptyTitle>
						<EmptyDescription>
							Armá un carrito para sumarte a una compra mayorista compartida.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild variant="highlight">
							<Link href="/products">Ver productos</Link>
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<MyOrdersClient orders={orders} />
			)}
		</main>
	);
}
