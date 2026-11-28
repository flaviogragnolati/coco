"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";
import type { OrderListOutput } from "~/shared/common/checkout.types";
import { OrderListPane } from "./order-list-pane";

/**
 * "Mis pedidos" with the list and the open order side by side. On a phone it
 * is one or the other: the list, or the order with a way back. Props only, so
 * the tutorial can render it.
 */
export function MyOrdersShell({
	list,
	detail,
	detailOpen,
}: {
	list: ReactNode;
	detail: ReactNode;
	/** An order was picked: on a phone it replaces the list. */
	detailOpen: boolean;
}) {
	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
			<div className={cn("min-w-0", detailOpen && "hidden lg:block")}>
				{list}
			</div>
			<div className={cn("min-w-0", !detailOpen && "hidden lg:block")}>
				{detail}
			</div>
		</div>
	);
}

/**
 * The shell on the real route: the open order is the URL segment, so picking
 * one is a navigation, the back button works, and each order has its address.
 * Without one, the newest order is shown beside the list.
 */
export function MyOrdersRouteShell({
	orders,
	children,
}: {
	orders: OrderListOutput;
	children: ReactNode;
}) {
	const segment = useSelectedLayoutSegment();
	const openId = segment ? Number(segment) : null;

	return (
		<MyOrdersShell
			detail={children}
			detailOpen={openId !== null}
			list={
				<OrderListPane
					orders={orders}
					selectedId={openId ?? orders[0]?.id ?? null}
				/>
			}
		/>
	);
}
