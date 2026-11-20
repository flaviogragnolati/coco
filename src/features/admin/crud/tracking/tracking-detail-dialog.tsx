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
	DetailEmpty,
	DetailField,
	DetailGrid,
	DetailSection,
} from "~/features/admin/crud/_components/crud-detail";
import { CrudDetailDialogShell } from "~/features/admin/crud/_components/crud-detail-dialog-shell";
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

function itemDescription(detail: AdminTrackingCartItemDetail) {
	const { cartItem } = detail;
	const orders =
		cartItem.orders.length > 0
			? cartItem.orders.map((order) => order.code).join(", ")
			: "Sin orden";

	return `${cartItem.cart.user.name} · ${cartItem.cart.user.email} · Carrito ${cartItem.cart.code} · ${orders}`;
}

function ItemStatus({ detail }: { detail: AdminTrackingCartItemDetail }) {
	const { cartItem } = detail;

	return (
		<>
			<StatusChip config={cartItemStatusConfig[cartItem.status]} />
			<StatusChip
				config={fulfillmentStatusConfig[cartItem.fulfillmentStatus]}
			/>
			<Badge className="tabular-nums" variant="outline">
				{cartItem.quantity} {cartItem.product.unit}
			</Badge>
			{cartItem.deleted ? <Badge variant="destructive">Eliminado</Badge> : null}
		</>
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
		<DetailSection title="Recorrido">
			<TrackingJourneyStepper stages={stages} />
		</DetailSection>
	);
}

function RelatedLinks({ detail }: { detail: AdminTrackingCartItemDetail }) {
	const links = collectRelatedLinks(detail);

	return (
		<DetailSection title="Relacionados">
			<div className="flex flex-wrap items-center gap-2">
				{links.map((link) => (
					<Badge asChild key={link.key} variant="outline">
						<Link href={link.href}>{link.label}</Link>
					</Badge>
				))}
			</div>
		</DetailSection>
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
		<DetailGrid columns={4}>
			<DetailField
				hint={
					<span className="flex flex-col gap-0.5">
						<span>{cartItem.cart.user.email}</span>
						<span>Rol: {cartItem.cart.user.role}</span>
					</span>
				}
				label="Usuario"
			>
				{cartItem.cart.user.name}
			</DetailField>
			<DetailField
				hint={
					<span className="flex flex-col items-start gap-1">
						<span className="tabular-nums">
							#{cartItem.cart.id} / {cartItem.cart.status}
						</span>
						{cartItem.cart.deleted ? (
							<Badge variant="destructive">Eliminado</Badge>
						) : null}
					</span>
				}
				label="Carrito"
			>
				<span className="font-mono">{cartItem.cart.code}</span>
			</DetailField>
			<DetailField
				hint={
					<span className="tabular-nums">
						#{cartItem.id} / {cartItem.quantity} {cartItem.product.unit}
					</span>
				}
				label="Item"
			>
				<span className="font-mono">{cartItem.code}</span>
			</DetailField>
			<DetailField
				hint={
					<span className="flex flex-col gap-0.5">
						<span className="tabular-nums">
							Producto #{cartItem.product.id}
						</span>
						<span>
							{cartItem.orders.length > 0
								? cartItem.orders
										.map(
											(order) =>
												`${order.code} (${orderStatusLabelMap[order.status]})`,
										)
										.join(", ")
								: "Sin orden"}
						</span>
					</span>
				}
				label="Producto y orden"
			>
				{cartItem.product.name}
			</DetailField>
		</DetailGrid>
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
		<CrudDetailDialogShell
			contentClassName="sm:max-w-4xl"
			description={
				detail
					? itemDescription(detail)
					: errorMessage
						? "No pudimos cargar el recorrido del item."
						: "Cargando el recorrido y los eventos del item."
			}
			errorMessage={errorMessage}
			eyebrow="Tracking"
			footer={
				<Button
					onClick={() => onOpenChange(false)}
					type="button"
					variant="outline"
				>
					Cerrar
				</Button>
			}
			isLoading={isLoading}
			onOpenChange={onOpenChange}
			open={open}
			status={detail ? <ItemStatus detail={detail} /> : null}
			title={
				detail ? (
					<>
						Item <span className="font-mono">{detail.cartItem.code}</span> —{" "}
						{detail.cartItem.product.name}
					</>
				) : (
					"Recorrido del item"
				)
			}
		>
			{detail ? (
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
									<DetailEmpty>
										Este item todavía no tiene eventos de tracking.
									</DetailEmpty>
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
		</CrudDetailDialogShell>
	);
}
