"use client";

import { ArchiveXIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type { CategoryListItem } from "~/shared/common/admin-crud/category.types";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";

const categoryColumns: CrudColumn<CategoryListItem>[] = [
	{
		key: "id",
		header: "ID",
		className: "w-20 font-mono",
		cell: (category) => category.id,
	},
	{
		key: "sortOrder",
		header: "Orden",
		className: "w-20 font-mono",
		cell: (category) => category.sortOrder,
	},
	{
		key: "name",
		header: "Nombre",
		cell: (category) => (
			<span className="font-medium text-foreground">{category.name}</span>
		),
	},
	{
		key: "productCount",
		header: "Productos",
		className: "w-28",
		cell: (category) => (
			<span className="text-muted-foreground">{category.productCount}</span>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (category) => (
			<CrudStatusBadge active={category.active} deleted={category.deleted} />
		),
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		className: "w-40",
		cell: (category) => formatDateTimeShort(category.updatedAt),
	},
];

export function CategoryTable({
	categories,
	onEdit,
	onSoftDelete,
	onHardDelete,
}: {
	categories: CategoryListItem[];
	onEdit: (category: CategoryListItem) => void;
	onSoftDelete: (category: CategoryListItem) => void;
	onHardDelete: (category: CategoryListItem) => void;
}) {
	const actions: CrudRowAction<CategoryListItem>[] = [
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
			disabled: (category) => category.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (category) => category.deleted,
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
			actions={(category) => (
				<CrudRowActions actions={actions} item={category} />
			)}
			columns={categoryColumns}
			getRowAriaLabel={(category) => `Editar categoría ${category.name}`}
			getRowClassName={(category) =>
				category.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(category) => category.id}
			isRowClickDisabled={(category) => category.deleted}
			items={categories}
			onRowClick={onEdit}
		/>
	);
}
