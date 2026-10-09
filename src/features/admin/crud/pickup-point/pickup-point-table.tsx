"use client";

import {
	ArchiveXIcon,
	ExternalLinkIcon,
	PencilIcon,
	PowerIcon,
	Trash2Icon,
} from "lucide-react";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type { PickupPointListItem } from "~/shared/common/admin-crud/pickup-point.types";
import { pickupPointAddressLine } from "./pickup-point.mappers";

const pickupPointColumns: CrudColumn<PickupPointListItem>[] = [
	{
		key: "id",
		header: "ID",
		className: "w-20 font-mono",
		cell: (point) => point.id,
	},
	{
		key: "name",
		header: "Punto de retiro",
		cell: (point) => (
			<div className="flex flex-col">
				<span className="font-medium text-foreground">{point.name}</span>
				<span className="text-muted-foreground text-xs">
					{pickupPointAddressLine(point)}
				</span>
			</div>
		),
	},
	{
		key: "hours",
		header: "Horarios",
		cell: (point) => <span className="text-xs">{point.hours}</span>,
	},
	{
		key: "googleMapsUrl",
		header: "Mapa",
		cell: (point) =>
			point.googleMapsUrl ? (
				<a
					className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
					href={point.googleMapsUrl}
					rel="noreferrer"
					target="_blank"
				>
					Abrir
					<ExternalLinkIcon className="size-3" />
				</a>
			) : (
				<span className="text-muted-foreground text-xs">Sin URL</span>
			),
	},
	{
		key: "pendingOrderCount",
		header: "Pedidos en curso",
		className: "w-32",
		cell: (point) => point.pendingOrderCount,
	},
	{
		key: "status",
		header: "Estado",
		cell: (point) => (
			<CrudStatusBadge active={point.active} deleted={point.deleted} />
		),
	},
];

export function PickupPointTable({
	pickupPoints,
	onEdit,
	onToggleActive,
	onSoftDelete,
	onHardDelete,
}: {
	pickupPoints: PickupPointListItem[];
	onEdit: (point: PickupPointListItem) => void;
	onToggleActive: (point: PickupPointListItem) => void;
	onSoftDelete: (point: PickupPointListItem) => void;
	onHardDelete: (point: PickupPointListItem) => void;
}) {
	const actions = (
		point: PickupPointListItem,
	): CrudRowAction<PickupPointListItem>[] => [
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
			disabled: (item) => item.deleted,
		},
		{
			label: point.active ? "Desactivar" : "Activar",
			icon: PowerIcon,
			onSelect: onToggleActive,
			disabled: (item) => item.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (item) => item.deleted,
		},
		{
			label: "Eliminar definitivamente",
			icon: Trash2Icon,
			onSelect: onHardDelete,
			destructive: true,
		},
	];

	return (
		<CrudTable
			actions={(point) => (
				<CrudRowActions actions={actions(point)} item={point} />
			)}
			columns={pickupPointColumns}
			getRowAriaLabel={(point) => `Editar punto de retiro ${point.name}`}
			getRowClassName={(point) =>
				point.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(point) => point.id}
			isRowClickDisabled={(point) => point.deleted}
			items={pickupPoints}
			onRowClick={onEdit}
		/>
	);
}
