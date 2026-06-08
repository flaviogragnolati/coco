"use client";

import { Badge } from "~/components/ui/badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";
import type { AdminTrackingEventListItem } from "~/shared/common/tracking.types";
import {
	cartItemStatusLabelMap,
	fulfillmentStatusLabelMap,
	orderStatusLabelMap,
} from "../operations-cart/operations-cart.mappers";
import { formatTrackingRefs, trackingSourceOptions } from "./tracking.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const sourceLabelMap = Object.fromEntries(
	trackingSourceOptions.map((option) => [option.value, option.label]),
) as Record<AdminTrackingEventListItem["source"], string>;

const trackingColumns: CrudColumn<AdminTrackingEventListItem>[] = [
	{
		key: "createdAt",
		header: "Fecha",
		className: "min-w-36",
		cell: (event) => dateFormatter.format(new Date(event.createdAt)),
	},
	{
		key: "event",
		header: "Evento",
		className: "min-w-52",
		cell: (event) => (
			<div className="flex flex-col gap-1">
				<span className="font-medium text-foreground">{event.label}</span>
				<span className="font-mono text-muted-foreground text-xs">
					#{event.id}
				</span>
			</div>
		),
	},
	{
		key: "source",
		header: "Fuente",
		cell: (event) => (
			<div className="flex flex-col gap-1">
				<Badge variant="outline">{sourceLabelMap[event.source]}</Badge>
				{event.eventKey ? (
					<span className="max-w-48 truncate font-mono text-[11px] text-muted-foreground">
						{event.eventKey}
					</span>
				) : null}
			</div>
		),
	},
	{
		key: "actor",
		header: "Usuario/actor",
		className: "min-w-52",
		cell: (event) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-foreground">
					{event.actor.user?.name ?? event.cartItem.cart.user.name}
				</span>
				<span className="text-muted-foreground text-xs">
					{event.actor.user?.email ?? event.cartItem.cart.user.email}
				</span>
				{event.actor.reference ? (
					<span className="font-mono text-[11px] text-muted-foreground">
						{event.actor.reference}
					</span>
				) : null}
			</div>
		),
	},
	{
		key: "cart",
		header: "Carrito/item",
		className: "min-w-48",
		cell: (event) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-foreground">
					{event.cartItem.cart.code}
				</span>
				<span className="font-mono text-muted-foreground text-xs">
					Cart #{event.cartItem.cart.id} / Item #{event.cartItem.id}
				</span>
				<span className="text-muted-foreground text-xs">
					{cartItemStatusLabelMap[event.cartItem.status]} /{" "}
					{fulfillmentStatusLabelMap[event.cartItem.fulfillmentStatus]}
				</span>
			</div>
		),
	},
	{
		key: "product",
		header: "Producto/cantidad",
		className: "min-w-56",
		cell: (event) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-foreground">
					{event.cartItem.product.name}
				</span>
				<span className="text-muted-foreground text-xs">
					Item {event.cartItem.quantity} {event.cartItem.product.unit}
					{event.quantity ? ` / Evento ${event.quantity}` : ""}
				</span>
				<span className="text-muted-foreground text-xs">
					{event.cartItem.orders.length > 0
						? event.cartItem.orders
								.map(
									(order) =>
										`${order.code} (${orderStatusLabelMap[order.status]})`,
								)
								.join(", ")
						: "Sin orden relacionada"}
				</span>
			</div>
		),
	},
	{
		key: "refs",
		header: "Refs",
		className: "min-w-52",
		cell: (event) => {
			const refs = formatTrackingRefs(event.refs);

			return refs.length > 0 ? (
				<div className="flex max-w-64 flex-wrap gap-1">
					{refs.map((ref) => (
						<Badge key={ref} variant="secondary">
							{ref}
						</Badge>
					))}
				</div>
			) : (
				<span className="text-muted-foreground text-xs">Sin refs</span>
			);
		},
	},
];

export function TrackingEventTable({
	events,
	onSelect,
}: {
	events: AdminTrackingEventListItem[];
	onSelect: (event: AdminTrackingEventListItem) => void;
}) {
	return (
		<CrudTable
			columns={trackingColumns}
			getRowAriaLabel={(event) =>
				`Ver timeline del item ${event.cartItem.code}`
			}
			getRowKey={(event) => event.id}
			items={events}
			onRowClick={onSelect}
		/>
	);
}
