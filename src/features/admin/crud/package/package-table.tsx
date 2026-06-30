"use client";

import {
	DateTooltip,
	IdTooltip,
} from "~/features/admin/crud/_components/crud-cell-tooltips";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import { OperationalDiagnosticBadge } from "~/features/admin/crud/_components/operational-diagnostic-badge";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";
import type { PackageListItem } from "~/shared/common/admin-crud/package.types";
import { packageStatusConfig } from "./package.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const packageColumns: CrudColumn<PackageListItem>[] = [
	{
		key: "package",
		header: "Paquete",
		className: "min-w-44",
		cell: (pkg) => (
			<div className="flex flex-col gap-1">
				<span className="font-medium">{pkg.name}</span>
				<IdTooltip id={pkg.id} label="Paquete" />
				{pkg.trackingCode ? (
					<span className="text-muted-foreground text-xs">
						Tracking {pkg.trackingCode}
					</span>
				) : null}
			</div>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (pkg) => <StatusChip config={packageStatusConfig[pkg.status]} />,
	},
	{
		key: "shipment",
		header: "Envio",
		className: "min-w-44",
		cell: (pkg) =>
			pkg.shipment ? (
				<div className="flex flex-col gap-1">
					<span>{pkg.shipment.internalCode}</span>
					<span className="text-muted-foreground text-xs">
						{pkg.shipment.name}
					</span>
				</div>
			) : (
				<span className="text-muted-foreground text-xs">Sin envio</span>
			),
	},
	{
		key: "quantity",
		header: "Cantidades",
		className: "min-w-52",
		cell: (pkg) => (
			<div className="flex flex-col gap-1 text-xs">
				<span>Lineas: {pkg.packageLineQuantity}</span>
				<span>Asignado: {pkg.packagedAllocationQuantity}</span>
				<span>Sin asignar: {pkg.unallocatedQuantity}</span>
			</div>
		),
	},
	{
		key: "diagnostics",
		header: "Diagnosticos",
		className: "min-w-60",
		cell: (pkg) => (
			<div className="flex flex-col gap-1">
				<OperationalDiagnosticBadge
					count={pkg.diagnosticCount}
					severity={pkg.highestDiagnosticSeverity}
				/>
				{pkg.diagnosticMessages.map((message) => (
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
		cell: (pkg) => (
			<div className="flex flex-col gap-1 text-xs">
				<DateTooltip value={pkg.createdAt} />
				<span className="text-muted-foreground">
					Act. {dateFormatter.format(new Date(pkg.updatedAt))}
				</span>
			</div>
		),
	},
];

export function PackageTable({
	packages,
	onSelect,
}: {
	packages: PackageListItem[];
	onSelect: (pkg: PackageListItem) => void;
}) {
	return (
		<CrudTable
			columns={packageColumns}
			getRowAriaLabel={(pkg) => `Ver paquete ${pkg.name}`}
			getRowKey={(pkg) => pkg.id}
			items={packages}
			onRowClick={onSelect}
		/>
	);
}
