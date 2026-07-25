"use client";

import Link from "next/link";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { TrackingJourneyStepper } from "~/features/tracking/tracking-journey-stepper";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import type {
	AdminTrackingCartItemDetail,
	AdminTrackingJourney,
	AdminTrackingTimelineDetailItem,
} from "~/shared/common/tracking.types";
import {
	cartItemStatusConfig,
	fulfillmentStatusConfig,
	orderStatusLabelMap,
} from "../operations-cart/operations-cart.mappers";
import { TrackingTimelineItemCard } from "./tracking-timeline.parts";

/**
 * Entity list pages open their detail dialog when they receive `?detailId=`.
 * On `/admin/tracking` the id params are *filters* instead — do not mix the two
 * vocabularies when building hrefs.
 */
type LinkableEntity = "operation" | "lot" | "package" | "shipment";

const entityPathMap: Record<LinkableEntity, string> = {
	operation: "/admin/operations",
	lot: "/admin/lots",
	package: "/admin/packages",
	shipment: "/admin/shipments",
};

function adminEntityHref(kind: LinkableEntity, id: number) {
	return `${entityPathMap[kind]}?detailId=${id}`;
}

function cartHref(cartId: number) {
	return `/admin/carts/${cartId}`;
}

type RelatedLink = { key: string; label: string; href: string };

/** Every entity the item passed through, deduplicated across the whole history. */
function collectRelatedLinks(
	detail: AdminTrackingCartItemDetail,
): RelatedLink[] {
	const links = new Map<string, RelatedLink>();
	const add = (key: string, label: string, href: string) => {
		if (!links.has(key)) links.set(key, { key, label, href });
	};

	add(
		`cart-${detail.cartItem.cart.id}`,
		`Carrito ${detail.cartItem.cart.code}`,
		cartHref(detail.cartItem.cart.id),
	);

	for (const event of detail.timeline) {
		const { operation, lot, lotItem, shipment } = event.related;

		if (operation) {
			add(
				`operation-${operation.id}`,
				`Operación ${operation.code}`,
				adminEntityHref("operation", operation.id),
			);
		}
		if (lot) {
			add(`lot-${lot.id}`, `Lote ${lot.code}`, adminEntityHref("lot", lot.id));
		}
		// Lot items have no page of their own — they link to the containing lot.
		if (lotItem && lot) {
			add(
				`lot-item-${lotItem.id}`,
				`Lot item ${lotItem.code}`,
				adminEntityHref("lot", lot.id),
			);
		}
		if (event.related.package) {
			add(
				`package-${event.related.package.id}`,
				`Paquete ${event.related.package.name}`,
				adminEntityHref("package", event.related.package.id),
			);
		}
		if (shipment) {
			add(
				`shipment-${shipment.id}`,
				`Envío ${shipment.internalCode}`,
				adminEntityHref("shipment", shipment.id),
			);
		}
	}

	return Array.from(links.values());
}

function ItemHeader({ detail }: { detail: AdminTrackingCartItemDetail }) {
	const { cartItem } = detail;
	const orders =
		cartItem.orders.length > 0
			? cartItem.orders.map((order) => order.code).join(", ")
			: "Sin orden";

	return (
		<DialogHeader>
			<DialogTitle>
				Item {cartItem.code} — {cartItem.product.name}
			</DialogTitle>
			<DialogDescription>
				{cartItem.cart.user.name} · {cartItem.cart.user.email} · Carrito{" "}
				{cartItem.cart.code} · {orders}
			</DialogDescription>
			<div className="flex flex-wrap items-center gap-2 pt-1">
				<StatusChip config={cartItemStatusConfig[cartItem.status]} />
				<StatusChip
					config={fulfillmentStatusConfig[cartItem.fulfillmentStatus]}
				/>
				<Badge variant="outline">
					{cartItem.quantity} {cartItem.product.unit}
				</Badge>
				{cartItem.deleted ? (
					<Badge variant="destructive">Eliminado</Badge>
				) : null}
			</div>
		</DialogHeader>
	);
}

function OutcomeBanner({
	journey,
	isInCart,
}: {
	journey: AdminTrackingJourney;
	isInCart: boolean;
}) {
	if (journey.outcome) {
		const { kind, label, createdAt } = journey.outcome;
		const isTerminalBad =
			kind === "dropped" || kind === "cancelled" || kind === "exception";

		return (
			<Alert variant={isTerminalBad ? "destructive" : "default"}>
				<AlertTitle>{label}</AlertTitle>
				<AlertDescription>
					{createdAt
						? `Registrado el ${formatDateTimeShort(new Date(createdAt))}.`
						: "El recorrido quedó congelado en la etapa alcanzada."}
				</AlertDescription>
			</Alert>
		);
	}

	if (!isInCart) return null;

	return (
		<Alert>
			<AlertTitle>El item todavía está en el carrito</AlertTitle>
			<AlertDescription>
				El recorrido empieza cuando el usuario confirma el pedido.
			</AlertDescription>
		</Alert>
	);
}

function JourneySection({ journey }: { journey: AdminTrackingJourney }) {
	const stages = journey.stages.map((stage) => ({
		key: stage.key,
		label: stage.label,
		description: stage.description,
		status: stage.status,
		warning: stage.warning,
		timestamp: stage.createdAt,
		noticeLabels: journey.notices
			.filter((notice) => notice.stageKey === stage.key)
			.map((notice) => notice.label),
	}));

	return (
		<section className="rounded-2xl border p-4">
			<h3 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				Recorrido
			</h3>
			<TrackingJourneyStepper stages={stages} />
		</section>
	);
}

function RelatedLinks({ detail }: { detail: AdminTrackingCartItemDetail }) {
	const links = collectRelatedLinks(detail);

	return (
		<section className="flex flex-wrap items-center gap-2 rounded-2xl border p-3">
			<span className="text-muted-foreground text-xs">Relacionados</span>
			{links.map((link) => (
				<Badge asChild key={link.key} variant="outline">
					<Link href={link.href}>{link.label}</Link>
				</Badge>
			))}
		</section>
	);
}

function RelatedSummary({ event }: { event: AdminTrackingTimelineDetailItem }) {
	const related = event.related;
	const entries: Array<{ key: string; label: string; href?: string }> = [
		related.actorUser
			? {
					key: "actor",
					label: `Actor ${related.actorUser.name} (${related.actorUser.email})`,
				}
			: null,
		related.operation
			? {
					key: "operation",
					label: `Operación ${related.operation.code} (${related.operation.strategy})`,
					href: adminEntityHref("operation", related.operation.id),
				}
			: null,
		related.lot
			? {
					key: "lot",
					label: `Lote ${related.lot.code} - ${related.lot.status} - ${related.lot.supplierName}`,
					href: adminEntityHref("lot", related.lot.id),
				}
			: null,
		related.lotItem
			? {
					key: "lot-item",
					label: `Lot item ${related.lotItem.code} - ${related.lotItem.productName} - ${related.lotItem.quantity}`,
					href: related.lot
						? adminEntityHref("lot", related.lot.id)
						: undefined,
				}
			: null,
		related.package
			? {
					key: "package",
					label: `Paquete ${related.package.name} - ${related.package.status}`,
					href: adminEntityHref("package", related.package.id),
				}
			: null,
		related.shipment
			? {
					key: "shipment",
					label: `Envío ${related.shipment.internalCode} - ${related.shipment.status}`,
					href: adminEntityHref("shipment", related.shipment.id),
				}
			: null,
		related.rollOver
			? {
					key: "rollover",
					label: `Rollover ${related.rollOver.stage} - ${related.rollOver.status} - ${related.rollOver.quantity}`,
				}
			: null,
		related.cartItemLotItem
			? {
					key: "cart-item-lot-item",
					label: `Asignación de demanda #${related.cartItemLotItem.id} - ${related.cartItemLotItem.quantity}`,
				}
			: null,
		related.packageAllocation
			? {
					key: "package-allocation",
					label: `Asignación empaquetada #${related.packageAllocation.id} - ${related.packageAllocation.quantity}`,
				}
			: null,
	].filter((entry) => entry !== null);

	if (entries.length === 0) {
		return <span className="text-muted-foreground text-xs">Sin entidades</span>;
	}

	return (
		<div className="flex flex-wrap gap-1">
			{entries.map((entry) =>
				entry.href ? (
					<Badge
						asChild
						className="h-auto whitespace-normal py-1"
						key={entry.key}
						variant="outline"
					>
						<Link href={entry.href}>{entry.label}</Link>
					</Badge>
				) : (
					<Badge
						className="h-auto whitespace-normal py-1"
						key={entry.key}
						variant="outline"
					>
						{entry.label}
					</Badge>
				),
			)}
		</div>
	);
}

function AdditionalInfo({ detail }: { detail: AdminTrackingCartItemDetail }) {
	const { cartItem } = detail;

	return (
		<section className="grid gap-3 md:grid-cols-4">
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
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
				{detail ? (
					<ItemHeader detail={detail} />
				) : (
					<DialogHeader>
						<DialogTitle>Recorrido del item</DialogTitle>
						<DialogDescription>
							{errorMessage
								? "No pudimos cargar el recorrido del item."
								: "Cargando el recorrido y los eventos del item."}
						</DialogDescription>
					</DialogHeader>
				)}

				{isLoading ? (
					<div className="grid gap-3">
						<Skeleton className="h-24 w-full" />
						<CrudLoadingState rows={4} />
					</div>
				) : errorMessage ? (
					<CrudErrorState message={errorMessage} />
				) : detail ? (
					<div className="flex flex-col gap-3">
						<OutcomeBanner
							isInCart={detail.cartItem.status === "inCart"}
							journey={detail.journey}
						/>
						<JourneySection journey={detail.journey} />
						<RelatedLinks detail={detail} />

						<Accordion className="w-full" type="multiple">
							<AccordionItem value="eventos">
								<AccordionTrigger>
									Eventos ({detail.timeline.length})
								</AccordionTrigger>
								<AccordionContent>
									{detail.timeline.length > 0 ? (
										<ol className="grid gap-3">
											{detail.timeline.map((event) => (
												<TrackingTimelineItemCard
													extra={<RelatedSummary event={event} />}
													item={event}
													key={event.id}
												/>
											))}
										</ol>
									) : (
										<div className="rounded-lg border p-3 text-muted-foreground text-sm">
											Este cart item todavia no tiene eventos de tracking.
										</div>
									)}
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="informacion">
								<AccordionTrigger>Información adicional</AccordionTrigger>
								<AccordionContent>
									<AdditionalInfo detail={detail} />
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</div>
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
