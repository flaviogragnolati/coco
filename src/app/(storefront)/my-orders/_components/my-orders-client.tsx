"use client";

import {
	ArrowUpDownIcon,
	PackageSearchIcon,
	ShoppingBagIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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
import type { OrderListOutput } from "~/shared/common/checkout.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { formatDateTimeMedium } from "~/shared/common/date.helpers";
import {
	type OrderStatusFilterKey,
	orderStatusChipConfigMap,
	orderStatusFilterKeys,
	orderStatusFilterLabelMap,
	paymentStatusLabel,
} from "~/shared/common/order-display";
import {
	applyOrderListView,
	countOrdersByFilter,
	type OrderListSort,
} from "./order-list-view";

export function MyOrdersClient({ orders }: { orders: OrderListOutput }) {
	const [filter, setFilter] = useState<OrderStatusFilterKey>("all");
	const [sort, setSort] = useState<OrderListSort>("newest");

	// Counters always describe the whole list, never the filtered view.
	const counts = useMemo(() => countOrdersByFilter(orders), [orders]);
	const visibleOrders = useMemo(
		() => applyOrderListView(orders, { filter, sort }),
		[orders, filter, sort],
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap gap-2">
					{orderStatusFilterKeys.map((key) => (
						<Button
							aria-pressed={filter === key}
							className="rounded-full"
							key={key}
							onClick={() => setFilter(key)}
							size="sm"
							type="button"
							variant={filter === key ? "default" : "secondary"}
						>
							{orderStatusFilterLabelMap[key]} ({counts[key]})
						</Button>
					))}
				</div>
				<Button
					onClick={() =>
						setSort((current) => (current === "newest" ? "oldest" : "newest"))
					}
					size="sm"
					type="button"
					variant="ghost"
				>
					<ArrowUpDownIcon data-icon="inline-start" />
					{sort === "newest" ? "Más recientes" : "Más antiguos"}
				</Button>
			</div>

			{visibleOrders.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PackageSearchIcon />
						</EmptyMedia>
						<EmptyTitle>Sin pedidos en este filtro</EmptyTitle>
						<EmptyDescription>
							Probá con otro estado para ver el resto de tus pedidos.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button onClick={() => setFilter("all")} type="button">
							Ver todos
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<section className="grid gap-4 md:grid-cols-2">
					{visibleOrders.map((order) => {
						const statusChip = orderStatusChipConfigMap[order.status];
						const StatusIcon = statusChip.icon;

						return (
							<Card key={order.id}>
								<CardHeader>
									<div className="flex items-start justify-between gap-3">
										<div className="flex min-w-0 items-start gap-3">
											<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
												<ShoppingBagIcon className="size-4" />
											</span>
											<div className="flex min-w-0 flex-col gap-1">
												<CardTitle className="font-semibold text-xl">
													{order.currency
														? formatCurrency(order.totalAmount, order.currency)
														: "-"}
												</CardTitle>
												<CardDescription>
													{formatDateTimeMedium(order.createdAt)}
												</CardDescription>
											</div>
										</div>
										<Badge className="shrink-0" variant={statusChip.variant}>
											<StatusIcon data-icon="inline-start" />
											{statusChip.label}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="flex flex-col gap-2 text-xs">
									<div className="min-w-0">
										<span
											className="block truncate font-mono text-muted-foreground"
											title={order.code}
										>
											{order.code}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
										<span>
											{order.itemCount}{" "}
											{order.itemCount === 1 ? "ítem" : "ítems"}
										</span>
										<span>
											Pago: {paymentStatusLabel(order.latestTransactionStatus)}
										</span>
									</div>
								</CardContent>
								<CardFooter>
									<Button asChild className="w-full" variant="outline">
										<Link href={`/my-orders/${order.id}`}>Ver seguimiento</Link>
									</Button>
								</CardFooter>
							</Card>
						);
					})}
				</section>
			)}
		</div>
	);
}
