"use client";

import { ArchiveXIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type { BrandListItem } from "~/shared/common/admin-crud/brand.types";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const brandColumns: CrudColumn<BrandListItem>[] = [
	{
		key: "id",
		header: "ID",
		className: "w-20 font-mono",
		cell: (brand) => brand.id,
	},
	{
		key: "name",
		header: "Nombre",
		cell: (brand) => (
			<span className="font-medium text-foreground">{brand.name}</span>
		),
	},
	{
		key: "description",
		header: "Descripción",
		className: "max-w-[24rem] truncate",
		cell: (brand) => (
			<span
				className="block truncate text-muted-foreground"
				title={brand.description ?? ""}
			>
				{brand.description || "Sin descripción"}
			</span>
		),
	},
	{
		key: "logoUrl",
		header: "Logo",
		className: "max-w-[20rem] truncate",
		cell: (brand) => (
			<span
				className="block truncate text-muted-foreground"
				title={brand.logoUrl ?? ""}
			>
				{brand.logoUrl || "Sin logo"}
			</span>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (brand) => (
			<CrudStatusBadge active={brand.active} deleted={brand.deleted} />
		),
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		className: "w-40",
		cell: (brand) => dateFormatter.format(brand.updatedAt),
	},
];

export function BrandTable({
	brands,
	onEdit,
	onSoftDelete,
	onHardDelete,
}: {
	brands: BrandListItem[];
	onEdit: (brand: BrandListItem) => void;
	onSoftDelete: (brand: BrandListItem) => void;
	onHardDelete: (brand: BrandListItem) => void;
}) {
	const actions: CrudRowAction<BrandListItem>[] = [
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
			disabled: (brand) => brand.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (brand) => brand.deleted,
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
			actions={(brand) => <CrudRowActions actions={actions} item={brand} />}
			columns={brandColumns}
			getRowClassName={(brand) =>
				brand.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(brand) => brand.id}
			items={brands}
		/>
	);
}
