"use client";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import type {
	AdminTrackingCartItemDetail,
	AdminTrackingTimelineDetailItem,
} from "~/shared/common/tracking.types";
import {
	cartItemStatusLabelMap,
	fulfillmentStatusLabelMap,
	orderStatusLabelMap,
} from "../operations-cart/operations-cart.mappers";
import { TrackingTimelineItemCard } from "./tracking-timeline.parts";

function SummaryGrid({ detail }: { detail: AdminTrackingCartItemDetail }) {
	const { cartItem } = detail;

	return (
		<section className="grid gap-3 rounded-none border p-3 md:grid-cols-4">
			<div className="flex flex-col gap-1">
				<span className="text-muted-foreground text-xs">Usuario</span>
				<span className="font-medium">{cartItem.cart.user.name}</span>
				<span className="text-muted-foreground text-xs">
					{cartItem.cart.user.email}
				</span>
				<span className="text-muted-foreground text-xs">
					Rol: {cartItem.cart.user.role}
				</span>
			</div>
			<div className="flex flex-col gap-1">
				<span className="text-muted-foreground text-xs">Carrito</span>
				<span className="font-mono">{cartItem.cart.code}</span>
				<span className="text-muted-foreground text-xs">
					#{cartItem.cart.id} / {cartItem.cart.status}
				</span>
				{cartItem.cart.deleted ? (
					<Badge variant="destructive">Eliminado</Badge>
				) : null}
			</div>
			<div className="flex flex-col gap-1">
				<span className="text-muted-foreground text-xs">Item</span>
				<span className="font-mono">{cartItem.code}</span>
				<span className="text-muted-foreground text-xs">
					#{cartItem.id} / {cartItem.quantity} {cartItem.product.unit}
				</span>
				<span className="text-muted-foreground text-xs">
					{cartItemStatusLabelMap[cartItem.status]} /{" "}
					{fulfillmentStatusLabelMap[cartItem.fulfillmentStatus]}
				</span>
			</div>
			<div className="flex flex-col gap-1">
				<span className="text-muted-foreground text-xs">Producto/orden</span>
				<span className="font-medium">{cartItem.product.name}</span>
				<span className="text-muted-foreground text-xs">
					Producto #{cartItem.product.id}
				</span>
				<span className="text-muted-foreground text-xs">
					{cartItem.orders.length > 0
						? cartItem.orders
								.map(
									(order) =>
										`${order.code} (${orderStatusLabelMap[order.status]})`,
								)
								.join(", ")
						: "Sin orden"}
				</span>
			</div>
		</section>
	);
}

function RelatedSummary({ event }: { event: AdminTrackingTimelineDetailItem }) {
	const related = event.related;
	const entries = [
		related.actorUser
			? `Actor ${related.actorUser.name} (${related.actorUser.email})`
			: null,
		related.operation
			? `Operacion ${related.operation.code} (${related.operation.strategy})`
			: null,
		related.lot
			? `Lote ${related.lot.code} - ${related.lot.status} - ${related.lot.supplierName}`
			: null,
		related.lotItem
			? `Lot item ${related.lotItem.code} - ${related.lotItem.productName} - ${related.lotItem.quantity}`
			: null,
		related.package
			? `Paquete ${related.package.name} - ${related.package.status}`
			: null,
		related.shipment
			? `Envio ${related.shipment.internalCode} - ${related.shipment.status}`
			: null,
		related.rollOver
			? `Rollover ${related.rollOver.stage} - ${related.rollOver.status} - ${related.rollOver.quantity}`
			: null,
		related.cartItemLotItem
			? `CartItemLotItem #${related.cartItemLotItem.id} - ${related.cartItemLotItem.quantity}`
			: null,
		related.packageAllocation
			? `PackageAllocation #${related.packageAllocation.id} - ${related.packageAllocation.quantity}`
			: null,
	].filter((entry): entry is string => Boolean(entry));

	if (entries.length === 0) {
		return <span className="text-muted-foreground text-xs">Sin entidades</span>;
	}

	return (
		<div className="flex flex-wrap gap-1">
			{entries.map((entry) => (
				<Badge
					className="h-auto whitespace-normal py-1"
					key={entry}
					variant="outline"
				>
					{entry}
				</Badge>
			))}
		</div>
	);
}

function TimelineEvent({ event }: { event: AdminTrackingTimelineDetailItem }) {
	return (
		<TrackingTimelineItemCard
			extra={<RelatedSummary event={event} />}
			item={event}
		/>
	);
}

export function TrackingDetailDialog({
	open,
	detail,
	isLoading,
	errorMessage,
	onOpenChange,
}: {
	open: boolean;
	detail?: AdminTrackingCartItemDetail;
	isLoading?: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[min(84rem,calc(100%-2rem))]">
				<DialogHeader>
					<DialogTitle>
						{detail
							? `Timeline de ${detail.cartItem.code}`
							: "Timeline de cart item"}
					</DialogTitle>
					<DialogDescription>
						Historial completo de eventos de tracking del item.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="grid gap-3">
						<Skeleton className="h-24 w-full" />
						<CrudLoadingState rows={4} />
					</div>
				) : errorMessage ? (
					<CrudErrorState message={errorMessage} />
				) : detail ? (
					<Tabs className="w-full" defaultValue="resumen">
						<TabsList className="flex-wrap" variant="line">
							<TabsTrigger value="resumen">Resumen</TabsTrigger>
							<TabsTrigger value="timeline">
								Timeline ({detail.timeline.length})
							</TabsTrigger>
						</TabsList>
						<TabsContent value="resumen">
							<SummaryGrid detail={detail} />
						</TabsContent>
						<TabsContent value="timeline">
							{detail.timeline.length > 0 ? (
								<ol className="grid gap-3">
									{detail.timeline.map((event) => (
										<TimelineEvent event={event} key={event.id} />
									))}
								</ol>
							) : (
								<div className="rounded-none border p-3 text-muted-foreground text-sm">
									Este cart item todavia no tiene eventos de tracking.
								</div>
							)}
						</TabsContent>
					</Tabs>
				) : null}

				<DialogFooter>
					<Button
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cerrar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
