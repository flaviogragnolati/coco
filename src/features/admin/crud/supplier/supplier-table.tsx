"use client";

import { ArchiveXIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type { SupplierListItem } from "~/shared/common/admin-crud/supplier.types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const supplierColumns: CrudColumn<SupplierListItem>[] = [
	{
		key: "id",
		header: "ID",
		className: "w-20 font-mono",
		cell: (supplier) => supplier.id,
	},
	{
		key: "name",
		header: "Nombre",
		cell: (supplier) => (
			<span className="font-medium text-foreground">{supplier.name}</span>
		),
	},
	{
		key: "description",
		header: "Descripción",
		className: "max-w-[24rem] truncate",
		cell: (supplier) => (
			<span
				className="block truncate text-muted-foreground"
				title={supplier.description ?? ""}
			>
				{supplier.description || "Sin descripción"}
			</span>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (supplier) => (
			<CrudStatusBadge active={supplier.active} deleted={supplier.deleted} />
		),
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		className: "w-40",
		cell: (supplier) => dateFormatter.format(supplier.updatedAt),
	},
];

export function SupplierTable({
	suppliers,
	onEdit,
	onSoftDelete,
	onHardDelete,
}: {
	suppliers: SupplierListItem[];
	onEdit: (supplier: SupplierListItem) => void;
	onSoftDelete: (supplier: SupplierListItem) => void;
	onHardDelete: (supplier: SupplierListItem) => void;
}) {
	const actions: CrudRowAction<SupplierListItem>[] = [
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
			disabled: (supplier) => supplier.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (supplier) => supplier.deleted,
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
			actions={(supplier) => (
				<CrudRowActions actions={actions} item={supplier} />
			)}
			columns={supplierColumns}
			getRowAriaLabel={(supplier) => `Editar proveedor ${supplier.name}`}
			getRowClassName={(supplier) =>
				supplier.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(supplier) => supplier.id}
			isRowClickDisabled={(supplier) => supplier.deleted}
			items={suppliers}
			onRowClick={onEdit}
		/>
	);
}
