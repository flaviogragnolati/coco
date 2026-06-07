"use client";

import { ArchiveXIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type { CarrierListItem } from "~/shared/common/admin-crud/carrier.types";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const carrierColumns: CrudColumn<CarrierListItem>[] = [
	{
		key: "id",
		header: "ID",
		className: "w-20 font-mono",
		cell: (carrier) => carrier.id,
	},
	{
		key: "name",
		header: "Carrier",
		cell: (carrier) => (
			<span className="font-medium text-foreground">{carrier.name}</span>
		),
	},
	{
		key: "description",
		header: "Descripcion",
		cell: (carrier) => (
			<span className="line-clamp-2 text-muted-foreground text-xs">
				{carrier.description || "Sin descripcion"}
			</span>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (carrier) => (
			<CrudStatusBadge active={carrier.active} deleted={carrier.deleted} />
		),
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		className: "w-40",
		cell: (carrier) => dateFormatter.format(carrier.updatedAt),
	},
];

export function CarrierTable({
	carriers,
	onEdit,
	onSoftDelete,
	onHardDelete,
}: {
	carriers: CarrierListItem[];
	onEdit: (carrier: CarrierListItem) => void;
	onSoftDelete: (carrier: CarrierListItem) => void;
	onHardDelete: (carrier: CarrierListItem) => void;
}) {
	const actions: CrudRowAction<CarrierListItem>[] = [
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
			disabled: (carrier) => carrier.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (carrier) => carrier.deleted,
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
			actions={(carrier) => <CrudRowActions actions={actions} item={carrier} />}
			columns={carrierColumns}
			getRowAriaLabel={(carrier) => `Editar carrier ${carrier.name}`}
			getRowClassName={(carrier) =>
				carrier.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(carrier) => carrier.id}
			isRowClickDisabled={(carrier) => carrier.deleted}
			items={carriers}
			onRowClick={onEdit}
		/>
	);
}
