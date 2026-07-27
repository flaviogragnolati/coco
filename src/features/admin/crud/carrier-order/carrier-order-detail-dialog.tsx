"use client";

import Link from "next/link";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CrudAvailableAction } from "~/features/admin/crud/_components/crud-available-action";
import { JsonPreview } from "~/features/admin/crud/_components/crud-json-preview";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { DiagnosticDetailChip } from "~/features/admin/crud/_components/diagnostic-detail-chip";
import {
	deliveryModeLabelMap,
	shipmentStatusConfig,
	shipmentTypeLabelMap,
} from "~/features/admin/crud/shipment/shipment.mappers";
import type {
	CarrierOrderCommandKey,
	CarrierOrderDetail,
} from "~/shared/common/admin-crud/carrier-order.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import {
	carrierOrderActionLabelMap,
	carrierOrderStatusConfig,
} from "./carrier-order.mappers";

const destructiveActions: ReadonlySet<CarrierOrderCommandKey> = new Set([
	"cancel",
	"markFailed",
	"softDelete",
	"hardDelete",
]);

function optionalDate(value: Date | null, label: string) {
	return (
		<p className="text-muted-foreground text-xs">
			{value
				? `${label} ${formatDateTimeShort(new Date(value))}`
				: `Sin ${label.toLowerCase()}`}
		</p>
	);
}

function Resumen({ carrierOrder }: { carrierOrder: CarrierOrderDetail }) {
	return (
		<div className="flex flex-col gap-3">
			<section className="grid gap-3 rounded-2xl border p-3 md:grid-cols-4">
				<div className="flex flex-col items-start gap-1">
					<p className="text-muted-foreground text-xs">Estado</p>
					<StatusChip config={carrierOrderStatusConfig[carrierOrder.status]} />
					{carrierOrder.deleted ? (
						<Badge variant="outline">Dada de baja</Badge>
					) : null}
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Transportista</p>
					<p className="font-medium">{carrierOrder.carrier.name}</p>
					<p className="text-muted-foreground text-xs">
						Carrier #{carrierOrder.carrier.id}
					</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Referencia externa</p>
					<p className="font-medium">
						{carrierOrder.externalReference ?? "Sin referencia"}
					</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Envíos</p>
					<p className="font-medium">
						{carrierOrder.liveShipmentCount} / {carrierOrder.shipmentCount}
					</p>
					<p className="text-muted-foreground text-xs">Activos / totales</p>
				</div>
			</section>

			<section className="grid gap-3 rounded-2xl border p-3 md:grid-cols-2">
				<div>
					<p className="text-muted-foreground text-xs">Hitos</p>
					{optionalDate(carrierOrder.requestedAt, "Solicitada")}
					{optionalDate(carrierOrder.confirmedAt, "Confirmada")}
					{optionalDate(carrierOrder.cancelledAt, "Cancelada")}
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Fechas</p>
					<p className="text-xs">
						Creada {formatDateTimeShort(new Date(carrierOrder.createdAt))}
					</p>
					<p className="text-muted-foreground text-xs">
						Actualizada {formatDateTimeShort(new Date(carrierOrder.updatedAt))}
					</p>
				</div>
			</section>

			<details className="rounded-2xl border p-3">
				<summary className="cursor-pointer font-medium text-sm">
					Metadata
				</summary>
				<div className="mt-3">
					<JsonPreview
						emptyLabel="Sin metadata"
						value={carrierOrder.metadata}
					/>
				</div>
			</details>
		</div>
	);
}

function Envios({
	carrierOrder,
	canRemove,
	removeReason,
	onRemoveShipment,
}: {
	carrierOrder: CarrierOrderDetail;
	canRemove: boolean;
	removeReason?: string;
	onRemoveShipment: (shipmentId: number) => void;
}) {
	if (carrierOrder.shipments.length === 0) {
		return (
			<p className="text-muted-foreground text-xs">
				La orden no tiene envíos asociados.
			</p>
		);
	}

	return (
		<section className="flex flex-col gap-2">
			{carrierOrder.shipments.map((shipment) => (
				<div
					className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
					key={shipment.id}
				>
					<div className="flex flex-col gap-1">
						<span className="font-medium">
							{shipment.internalCode} · {shipment.name}
						</span>
						<span className="text-muted-foreground text-xs">
							{shipmentTypeLabelMap[shipment.type]}
							{shipment.deliveryMode
								? ` · ${deliveryModeLabelMap[shipment.deliveryMode]}`
								: ""}{" "}
							· {shipment.packageCount} paquetes
						</span>
					</div>
					<div className="flex items-center gap-2">
						<StatusChip config={shipmentStatusConfig[shipment.status]} />
						<Button asChild size="sm" variant="outline">
							<Link href={`/admin/shipments?detailId=${shipment.id}`}>
								Ver envío
							</Link>
						</Button>
						<CrudAvailableAction
							destructive
							enabled={canRemove}
							label="Quitar"
							onClick={() => onRemoveShipment(shipment.id)}
							reason={removeReason}
						/>
					</div>
				</div>
			))}
		</section>
	);
}

function Diagnosticos({ carrierOrder }: { carrierOrder: CarrierOrderDetail }) {
	if (carrierOrder.diagnostics.length === 0) {
		return <p className="text-muted-foreground text-xs">Sin diagnósticos</p>;
	}

	return (
		<section className="flex flex-col gap-2">
			{carrierOrder.diagnostics.map((diagnostic) => (
				<div className="text-xs" key={diagnostic.code}>
					<DiagnosticDetailChip
						code={diagnostic.code}
						severity={diagnostic.severity}
					/>
					<p className="mt-1">{diagnostic.message}</p>
				</div>
			))}
		</section>
	);
}

export function CarrierOrderDetailDialog({
	open,
	carrierOrder,
	isLoading,
	errorMessage,
	onOpenChange,
	onCommand,
	onRemoveShipment,
}: {
	open: boolean;
	carrierOrder?: CarrierOrderDetail;
	isLoading: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
	onCommand: (action: CarrierOrderCommandKey) => void;
	onRemoveShipment: (shipmentId: number) => void;
}) {
	const removeState = carrierOrder?.availableActions.find(
		(entry) => entry.action === "removeShipment",
	);

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>
						{carrierOrder
							? carrierOrder.code
							: "Detalle de orden de transporte"}
					</DialogTitle>
					<DialogDescription>
						Contratación del transporte: envíos asociados, hitos y diagnósticos.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? <CrudLoadingState rows={4} /> : null}
				{!isLoading && errorMessage ? (
					<CrudErrorState message={errorMessage} />
				) : null}
				{!isLoading && carrierOrder ? (
					<Tabs className="w-full" defaultValue="resumen">
						<TabsList className="flex-wrap" variant="line">
							<TabsTrigger value="resumen">Resumen</TabsTrigger>
							<TabsTrigger value="envios">
								Envíos ({carrierOrder.shipments.length})
							</TabsTrigger>
							<TabsTrigger value="diagnosticos">Diagnósticos</TabsTrigger>
						</TabsList>
						<TabsContent value="resumen">
							<Resumen carrierOrder={carrierOrder} />
						</TabsContent>
						<TabsContent value="envios">
							<Envios
								canRemove={removeState?.enabled ?? false}
								carrierOrder={carrierOrder}
								onRemoveShipment={onRemoveShipment}
								removeReason={removeState?.reason}
							/>
						</TabsContent>
						<TabsContent value="diagnosticos">
							<Diagnosticos carrierOrder={carrierOrder} />
						</TabsContent>
					</Tabs>
				) : null}

				<DialogFooter className="flex-wrap">
					{carrierOrder?.availableActions
						// `removeShipment` needs a target row, so it lives on the Envíos tab
						// rather than in the footer; the two read the same server entry.
						.filter((entry) => entry.action !== "removeShipment")
						.map((entry) => (
							<CrudAvailableAction
								destructive={destructiveActions.has(entry.action)}
								enabled={entry.enabled}
								key={entry.action}
								label={carrierOrderActionLabelMap[entry.action]}
								onClick={() => onCommand(entry.action)}
								reason={entry.reason}
							/>
						))}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
