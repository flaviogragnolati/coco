import { PackageSearchIcon, ShoppingBagIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import { requireUser } from "~/server/auth/route-guards";
import type { OrderListItem } from "~/shared/common/checkout.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { api } from "~/trpc/server";

function orderStatusLabel(status: OrderListItem["status"]) {
	switch (status) {
		case "processing":
			return "En procesamiento";
		case "completed":
			return "Completado";
		case "cancelled":
			return "Cancelado";
		case "failed":
			return "Fallido";
		case "refunded":
			return "Reembolsado";
		default:
			return "Pendiente";
	}
}

function paymentStatusLabel(status: OrderListItem["latestTransactionStatus"]) {
	switch (status) {
		case "completed":
			return "Pago aprobado";
		case "failed":
			return "Pago rechazado";
		case "refunded":
			return "Pago reembolsado";
		case "pending":
			return "Pago pendiente";
		default:
			return "Sin pago";
	}
}

export default async function MyOperationsPage() {
	await requireUser();
	const orders = await api.orders.listMine();

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
			<section className="flex flex-col gap-2">
				<h1 className="font-heading font-semibold text-2xl tracking-normal">
					Mis operaciones
				</h1>
				<p className="text-muted-foreground text-sm/relaxed">
					Pedidos realizados y su estado comercial dentro de Coco.
				</p>
			</section>

			{orders.length === 0 ? (
				<Empty className="border">
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
						<Button asChild>
							<Link href="/products">Ver productos</Link>
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{orders.map((order) => (
						<Card key={order.id}>
							<CardHeader>
								<div className="flex items-start justify-between gap-3">
									<div className="flex flex-col gap-1">
										<CardTitle className="flex items-center gap-2">
											<ShoppingBagIcon />
											{order.code}
										</CardTitle>
										<CardDescription>
											{new Intl.DateTimeFormat("es-AR", {
												dateStyle: "medium",
												timeStyle: "short",
											}).format(order.createdAt)}
										</CardDescription>
									</div>
									<Badge
										variant={
											order.status === "failed" ? "destructive" : "secondary"
										}
									>
										{orderStatusLabel(order.status)}
									</Badge>
								</div>
							</CardHeader>
							<CardContent className="flex flex-col gap-3 text-xs">
								<div className="flex items-center justify-between gap-3">
									<span className="text-muted-foreground">Items</span>
									<span className="font-medium">{order.itemCount}</span>
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="text-muted-foreground">Pago</span>
									<span className="font-medium">
										{paymentStatusLabel(order.latestTransactionStatus)}
									</span>
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="text-muted-foreground">Monto</span>
									<span className="font-heading font-semibold text-base">
										{order.currency
											? formatCurrency(order.totalAmount, order.currency)
											: "-"}
									</span>
								</div>
							</CardContent>
							<CardFooter>
								<Button asChild className="w-full" variant="outline">
									<Link href={`/my-operations/${order.id}`}>Ver pedido</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</section>
			)}
		</main>
	);
}
