"use client";

import { ArchiveXIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type { UserListItem } from "~/shared/common/admin-crud/user.types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const roleLabelMap: Record<UserListItem["role"], string> = {
	admin: "Administrador",
	superadmin: "Superadmin",
	user: "Cliente",
};

const userColumns: CrudColumn<UserListItem>[] = [
	{
		key: "id",
		header: "ID",
		className: "w-28 font-mono text-xs",
		cell: (user) => <span title={user.id}>{user.id.slice(0, 8)}</span>,
	},
	{
		key: "name",
		header: "Usuario",
		cell: (user) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-foreground">{user.name}</span>
				<span className="text-muted-foreground text-xs">{user.email}</span>
			</div>
		),
	},
	{
		key: "role",
		header: "Rol",
		cell: (user) => roleLabelMap[user.role],
	},
	{
		key: "emailVerified",
		header: "Email verificado",
		cell: (user) => (user.emailVerified ? "Sí" : "No"),
	},
	{
		key: "addressCount",
		header: "Direcciones",
		cell: (user) => user.addressCount,
	},
	{
		key: "status",
		header: "Estado",
		cell: (user) => (
			<CrudStatusBadge active={user.active} deleted={user.deleted} />
		),
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		className: "w-40",
		cell: (user) => dateFormatter.format(user.updatedAt),
	},
];

export function UserTable({
	users,
	onEdit,
	onSoftDelete,
	onHardDelete,
}: {
	users: UserListItem[];
	onEdit: (user: UserListItem) => void;
	onSoftDelete: (user: UserListItem) => void;
	onHardDelete: (user: UserListItem) => void;
}) {
	const actions: CrudRowAction<UserListItem>[] = [
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
			disabled: (user) => user.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (user) => user.deleted,
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
			actions={(user) => <CrudRowActions actions={actions} item={user} />}
			columns={userColumns}
			getRowClassName={(user) =>
				user.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(user) => user.id}
			items={users}
		/>
	);
}
