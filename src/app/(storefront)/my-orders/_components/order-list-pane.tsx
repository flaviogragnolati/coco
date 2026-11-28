"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { OrderListOutput } from "~/shared/common/checkout.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { formatDateMedium } from "~/shared/common/date.helpers";
import {
	customerOrderStatusView,
	type OrderStatusFilterKey,
	orderStatusFilterKeys,
	orderStatusFilterLabelMap,
} from "~/shared/common/order-display";
import {
	applyOrderListView,
	countOrdersByFilter,
	formatOrderItemNames,
} from "./order-list-view";

/**
 * The order column of "Mis pedidos": each order named by its products, with
 * its status, total and date. Newest first; the status filters stay.
 */
export function OrderListPane({
	orders,
	selectedId,
}: {
	orders: OrderListOutput;
	/** The order open beside the list; null when none is. */
	selectedId: number | null;
}) {
	const [filter, setFilter] = useState<OrderStatusFilterKey>("all");
	const counts = useMemo(() => countOrdersByFilter(orders), [orders]);
	const visibleOrders = useMemo(
		() => applyOrderListView(orders, { filter, sort: "newest" }),
		[orders, filter],
	);
	const filters = orderStatusFilterKeys.filter(
		(key) => key === "all" || counts[key] > 0,
	);

	return (
		<div className="flex min-w-0 flex-col gap-3">
			{filters.length > 2 ? (
				<div className="flex flex-wrap gap-2">
					{filters.map((key) => (
						<button
							aria-pressed={filter === key}
							className={cn(
								"shrink-0 rounded-full border px-3 py-1.5 font-medium text-sm transition-colors",
								filter === key
									? "border-foreground bg-foreground text-background"
									: "bg-card hover:border-foreground",
							)}
							key={key}
							onClick={() => setFilter(key)}
							type="button"
						>
							{orderStatusFilterLabelMap[key]} ({counts[key]})
						</button>
					))}
				</div>
			) : null}

			<nav aria-label="Tus pedidos">
				<ul className="overflow-hidden rounded-[22px] border bg-card">
					{visibleOrders.length === 0 ? (
						<li className="p-5 text-muted-foreground text-sm">
							No hay pedidos con este estado.
						</li>
					) : (
						visibleOrders.map((order) => {
							const status = customerOrderStatusView(order);
							const selected = order.id === selectedId;
							return (
								<li className="border-b last:border-b-0" key={order.id}>
									<Link
										aria-current={selected ? "page" : undefined}
										className={cn(
											"flex flex-col gap-1.5 border-l-4 px-4 py-4 transition-colors hover:bg-muted/50",
											selected
												? "border-l-highlight bg-brand-soft/40"
												: "border-l-transparent",
										)}
										href={`/my-orders/${order.id}`}
									>
										<span className="flex items-center justify-between gap-3">
											<Badge variant={status.variant}>{status.label}</Badge>
											<span className="shrink-0 font-heading font-semibold tabular-nums">
												{order.currency
													? formatCurrency(order.totalAmount, order.currency)
													: "-"}
											</span>
										</span>
										<span className="font-heading font-semibold leading-snug">
											{formatOrderItemNames(order.itemNames)}
										</span>
										<span className="text-muted-foreground text-xs">
											{formatDateMedium(order.createdAt)}
										</span>
									</Link>
								</li>
							);
						})
					)}
				</ul>
			</nav>
		</div>
	);
}
