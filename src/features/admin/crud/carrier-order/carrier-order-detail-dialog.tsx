"use client";

import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CrudAvailableAction } from "~/features/admin/crud/_components/crud-available-action";
import {
	DetailDatesField,
	DetailDiagnosticList,
	DetailDisclosure,
	DetailEmpty,
	DetailField,
	DetailGrid,
	DetailItem,
	DetailMetrics,
	DetailSection,
} from "~/features/admin/crud/_components/crud-detail";
import { CrudDetailDialogShell } from "~/features/admin/crud/_components/crud-detail-dialog-shell";
import { JsonPreview } from "~/features/admin/crud/_components/crud-json-preview";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
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

function Hito({ value, label }: { value: Date | null; label: string }) {
	return (
		<DetailField label={label}>
			{value ? (
				<span className="font-normal">
					{formatDateTimeShort(new Date(value))}
				</span>
			) : (
				<span className="font-normal text-muted-foreground">Sin fecha</span>
			)}
		</DetailField>
	);
}

function Resumen({ carrierOrder }: { carrierOrder: CarrierOrderDetail }) {
	return (
		<div className="flex flex-col gap-3">
			<DetailMetrics
				columns={2}
				items={[
					{ label: "Envíos activos", value: carrierOrder.liveShipmentCount },
					{ label: "Envíos totales", value: carrierOrder.shipmentCount },
				]}
			/>

			<DetailSection title="Datos de la orden">
				<DetailGrid columns={3}>
					<DetailField
						hint={
							<>
								Transportista{" "}
								<span className="font-mono">#{carrierOrder.carrier.id}</span>
							</>
						}
						label="Transportista"
					>
						{carrierOrder.carrier.name}
					</DetailField>
					<DetailField label="Referencia externa">
						{carrierOrder.externalReference ?? (
							<span className="font-normal text-muted-foreground">
								Sin referencia
							</span>
						)}
					</DetailField>
					<DetailDatesField
						createdAt={carrierOrder.createdAt}
						feminine
						updatedAt={carrierOrder.updatedAt}
					/>
				</DetailGrid>
			</DetailSection>

			<DetailSection title="Hitos">
				<DetailGrid columns={3}>
					<Hito label="Solicitada" value={carrierOrder.requestedAt} />
					<Hito label="Confirmada" value={carrierOrder.confirmedAt} />
					<Hito label="Cancelada" value={carrierOrder.cancelledAt} />
				</DetailGrid>
			</DetailSection>

			<DetailDisclosure title="Datos técnicos: metadatos">
				<JsonPreview emptyLabel="Sin metadatos" value={carrierOrder.metadata} />
			</DetailDisclosure>
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
		return <DetailEmpty>La orden no tiene envíos asociados.</DetailEmpty>;
	}

	return (
		<section className="flex flex-col gap-2">
			{carrierOrder.shipments.map((shipment) => (
				<DetailItem
					className="flex flex-wrap items-center justify-between gap-2"
					key={shipment.id}
				>
					<div className="flex flex-col gap-1">
						<span className="font-medium">
							<span className="font-mono text-muted-foreground text-xs">
								{shipment.internalCode}
							</span>{" "}
							{shipment.name}
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
				</DetailItem>
			))}
		</section>
	);
}

function Diagnosticos({ carrierOrder }: { carrierOrder: CarrierOrderDetail }) {
	return <DetailDiagnosticList diagnostics={carrierOrder.diagnostics} />;
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
		<CrudDetailDialogShell
			description="Contratación del transporte: envíos asociados, hitos y diagnósticos."
			errorMessage={errorMessage}
			eyebrow="Orden de transporte"
			footer={
				carrierOrder
					? carrierOrder.availableActions
							// `removeShipment` needs a target row, so it lives on the Envíos
							// tab rather than in the footer; the two read the same server entry.
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
							))
					: null
			}
			isLoading={isLoading}
			onOpenChange={onOpenChange}
			open={open}
			status={
				carrierOrder ? (
					<>
						<StatusChip
							config={carrierOrderStatusConfig[carrierOrder.status]}
						/>
						{carrierOrder.deleted ? (
							<Badge variant="outline">Dada de baja</Badge>
						) : null}
					</>
				) : null
			}
			title={
				carrierOrder ? carrierOrder.code : "Detalle de orden de transporte"
			}
		>
			{carrierOrder ? (
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
		</CrudDetailDialogShell>
	);
}
