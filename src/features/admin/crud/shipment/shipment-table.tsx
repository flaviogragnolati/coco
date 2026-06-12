"use client";

import { Badge } from "~/components/ui/badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import { OperationalDiagnosticBadge } from "~/features/admin/crud/_components/operational-diagnostic-badge";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";
import type { ShipmentListItem } from "~/shared/common/admin-crud/shipment.types";
import {
	shipmentStatusLabelMap,
	shipmentTypeLabelMap,
} from "./shipment.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const shipmentColumns: CrudColumn<ShipmentListItem>[] = [
	{
		key: "shipment",
		header: "Envio",
		className: "min-w-48",
		cell: (shipment) => (
			<div className="flex flex-col gap-1">
				<span className="font-medium">{shipment.internalCode}</span>
				<span className="text-muted-foreground text-xs">{shipment.name}</span>
				<span className="font-mono text-muted-foreground text-xs">
					Envio #{shipment.id}
				</span>
			</div>
		),
	},
	{
		key: "type",
		header: "Tipo",
		cell: (shipment) => (
			<Badge variant="secondary">{shipmentTypeLabelMap[shipment.type]}</Badge>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (shipment) => (
			<Badge variant="outline">{shipmentStatusLabelMap[shipment.status]}</Badge>
		),
	},
	{
		key: "carrier",
		header: "Carrier",
		className: "min-w-44",
		cell: (shipment) =>
			shipment.carrierOrder ? (
				<div className="flex flex-col gap-1">
					<span>{shipment.carrierOrder.code}</span>
					<span className="text-muted-foreground text-xs">
						{shipment.carrierOrder.carrier.name}
					</span>
				</div>
			) : (
				<span className="text-muted-foreground text-xs">Sin orden carrier</span>
			),
	},
	{
		key: "quantity",
		header: "Cantidades",
		className: "min-w-52",
		cell: (shipment) => (
			<div className="flex flex-col gap-1 text-xs">
				<span>Paquetes: {shipment.packageCount}</span>
				<span>Lineas: {shipment.transportedQuantity}</span>
				<span>Asignado: {shipment.packagedAllocationQuantity}</span>
			</div>
		),
	},
	{
		key: "diagnostics",
		header: "Diagnosticos",
		className: "min-w-60",
		cell: (shipment) => (
			<div className="flex flex-col gap-1">
				<OperationalDiagnosticBadge
					count={shipment.diagnosticCount}
					severity={shipment.highestDiagnosticSeverity}
				/>
				{shipment.diagnosticMessages.map((message) => (
					<span className="text-muted-foreground text-xs" key={message}>
						{message}
					</span>
				))}
			</div>
		),
	},
	{
		key: "dates",
		header: "Fechas",
		className: "min-w-44",
		cell: (shipment) => (
			<div className="flex flex-col gap-1 text-xs">
				<span>{dateFormatter.format(new Date(shipment.createdAt))}</span>
				<span className="text-muted-foreground">
					Act. {dateFormatter.format(new Date(shipment.updatedAt))}
				</span>
			</div>
		),
	},
];

export function ShipmentTable({
	shipments,
	onSelect,
}: {
	shipments: ShipmentListItem[];
	onSelect: (shipment: ShipmentListItem) => void;
}) {
	return (
		<CrudTable
			columns={shipmentColumns}
			getRowAriaLabel={(shipment) => `Ver envio ${shipment.internalCode}`}
			getRowKey={(shipment) => shipment.id}
			items={shipments}
			onRowClick={onSelect}
		/>
	);
}
