"use client";

import {
	ArchiveXIcon,
	ExternalLinkIcon,
	PencilIcon,
	Trash2Icon,
} from "lucide-react";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type { DestinationListItem } from "~/shared/common/admin-crud/destination.types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const destinationColumns: CrudColumn<DestinationListItem>[] = [
	{
		key: "id",
		header: "ID",
		className: "w-20 font-mono",
		cell: (destination) => destination.id,
	},
	{
		key: "name",
		header: "Destino",
		cell: (destination) => (
			<span className="font-medium text-foreground">{destination.name}</span>
		),
	},
	{
		key: "googleMapsUrl",
		header: "Mapa",
		cell: (destination) =>
			destination.googleMapsUrl ? (
				<a
					className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
					href={destination.googleMapsUrl}
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
		key: "status",
		header: "Estado",
		cell: (destination) => (
			<CrudStatusBadge
				active={destination.active}
				deleted={destination.deleted}
			/>
		),
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		className: "w-40",
		cell: (destination) => dateFormatter.format(destination.updatedAt),
	},
];

export function DestinationTable({
	destinations,
	onEdit,
	onSoftDelete,
	onHardDelete,
}: {
	destinations: DestinationListItem[];
	onEdit: (destination: DestinationListItem) => void;
	onSoftDelete: (destination: DestinationListItem) => void;
	onHardDelete: (destination: DestinationListItem) => void;
}) {
	const actions: CrudRowAction<DestinationListItem>[] = [
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
			disabled: (destination) => destination.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (destination) => destination.deleted,
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
			actions={(destination) => (
				<CrudRowActions actions={actions} item={destination} />
			)}
			columns={destinationColumns}
			getRowClassName={(destination) =>
				destination.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(destination) => destination.id}
			items={destinations}
		/>
	);
}
