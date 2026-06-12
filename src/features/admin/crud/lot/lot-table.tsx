"use client";

import { Badge } from "~/components/ui/badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import { OperationalDiagnosticBadge } from "~/features/admin/crud/_components/operational-diagnostic-badge";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";
import type { LotListItem } from "~/shared/common/admin-crud/lot.types";
import { lotStatusLabelMap } from "./lot.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const lotColumns: CrudColumn<LotListItem>[] = [
	{
		key: "lot",
		header: "Lote",
		className: "min-w-44",
		cell: (lot) => (
			<div className="flex flex-col gap-1">
				<span className="font-medium">{lot.code}</span>
				<span className="font-mono text-muted-foreground text-xs">
					Lote #{lot.id}
				</span>
			</div>
		),
	},
	{
		key: "operation",
		header: "Operacion",
		className: "min-w-44",
		cell: (lot) => (
			<div className="flex flex-col gap-1">
				<span>{lot.operation.code}</span>
				<span className="font-mono text-muted-foreground text-xs">
					Op #{lot.operation.id}
				</span>
			</div>
		),
	},
	{
		key: "supplier",
		header: "Proveedor",
		className: "min-w-48",
		cell: (lot) => (
			<div className="flex flex-col gap-1">
				<span>{lot.supplier.name}</span>
				<span className="text-muted-foreground text-xs">
					{lot.supplierOrder
						? `Orden ${lot.supplierOrder.code}`
						: "Sin orden proveedor"}
				</span>
			</div>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (lot) => (
			<Badge variant="outline">{lotStatusLabelMap[lot.status]}</Badge>
		),
	},
	{
		key: "quantity",
		header: "Cantidades",
		className: "min-w-52",
		cell: (lot) => (
			<div className="flex flex-col gap-1 text-xs">
				<span>Lineas: {lot.lotItemQuantity}</span>
				<span>Demanda: {lot.demandAllocationQuantity}</span>
				<span>Pendiente empaque: {lot.pendingQuantity}</span>
			</div>
		),
	},
	{
		key: "diagnostics",
		header: "Diagnosticos",
		className: "min-w-60",
		cell: (lot) => (
			<div className="flex flex-col gap-1">
				<OperationalDiagnosticBadge
					count={lot.diagnosticCount}
					severity={lot.highestDiagnosticSeverity}
				/>
				{lot.diagnosticMessages.map((message) => (
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
		cell: (lot) => (
			<div className="flex flex-col gap-1 text-xs">
				<span>{dateFormatter.format(new Date(lot.createdAt))}</span>
				<span className="text-muted-foreground">
					Act. {dateFormatter.format(new Date(lot.updatedAt))}
				</span>
			</div>
		),
	},
];

export function LotTable({
	lots,
	onSelect,
}: {
	lots: LotListItem[];
	onSelect: (lot: LotListItem) => void;
}) {
	return (
		<CrudTable
			columns={lotColumns}
			getRowAriaLabel={(lot) => `Ver lote ${lot.code}`}
			getRowKey={(lot) => lot.id}
			items={lots}
			onRowClick={onSelect}
		/>
	);
}
