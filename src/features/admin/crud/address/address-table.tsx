"use client";

import { ArchiveXIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type { AddressListItem } from "~/shared/common/admin-crud/address.types";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const addressTypeLabelMap: Record<AddressListItem["type"], string> = {
	all: "General",
	billing: "Facturación",
	other: "Otra",
	shipping: "Envío",
};

const addressColumns: CrudColumn<AddressListItem>[] = [
	{
		key: "id",
		header: "ID",
		className: "w-20 font-mono",
		cell: (address) => address.id,
	},
	{
		key: "user",
		header: "Usuario",
		cell: (address) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-foreground">{address.user.name}</span>
				<span className="text-muted-foreground text-xs">
					{address.user.email}
				</span>
			</div>
		),
	},
	{
		key: "type",
		header: "Tipo",
		cell: (address) => addressTypeLabelMap[address.type],
	},
	{
		key: "line1",
		header: "Dirección",
		className: "max-w-[20rem] truncate",
		cell: (address) => (
			<span
				className="block truncate text-muted-foreground"
				title={address.line1}
			>
				{address.line1}
			</span>
		),
	},
	{
		key: "location",
		header: "Ubicación",
		cell: (address) => `${address.city}, ${address.state}`,
	},
	{
		key: "status",
		header: "Estado",
		cell: (address) => (
			<CrudStatusBadge active={address.active} deleted={address.deleted} />
		),
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		className: "w-40",
		cell: (address) => dateFormatter.format(address.updatedAt),
	},
];

export function AddressTable({
	addresses,
	onEdit,
	onSoftDelete,
	onHardDelete,
}: {
	addresses: AddressListItem[];
	onEdit: (address: AddressListItem) => void;
	onSoftDelete: (address: AddressListItem) => void;
	onHardDelete: (address: AddressListItem) => void;
}) {
	const actions: CrudRowAction<AddressListItem>[] = [
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
			disabled: (address) => address.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (address) => address.deleted,
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
			actions={(address) => <CrudRowActions actions={actions} item={address} />}
			columns={addressColumns}
			getRowAriaLabel={(address) => `Editar dirección ${address.line1}`}
			getRowClassName={(address) =>
				address.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(address) => address.id}
			isRowClickDisabled={(address) => address.deleted}
			items={addresses}
			onRowClick={onEdit}
		/>
	);
}
