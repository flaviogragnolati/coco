"use client";

import { ArchiveXIcon, EyeIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type { ProductListItem } from "~/shared/common/admin-crud/product.types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const unitLabelMap: Record<ProductListItem["unit"], string> = {
	box: "Caja",
	gr: "Gramo",
	kg: "Kg",
	lb: "Lb",
	other: "Otro",
	piece: "Unidad",
};

const productColumns: CrudColumn<ProductListItem>[] = [
	{
		key: "id",
		header: "ID",
		className: "w-20 font-mono",
		cell: (product) => product.id,
	},
	{
		key: "name",
		header: "Producto",
		cell: (product) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-foreground">{product.name}</span>
				<span className="text-muted-foreground text-xs">
					{unitLabelMap[product.unit]}
				</span>
			</div>
		),
	},
	{
		key: "brand",
		header: "Marca",
		cell: (product) => (
			<span className="text-muted-foreground text-xs">
				{product.brand
					? `${product.brand.name}${product.brand.deleted ? " (eliminada)" : ""}`
					: "Sin marca"}
			</span>
		),
	},
	{
		key: "defaultSupplier",
		header: "Proveedor por defecto",
		cell: (product) => (
			<span className="text-muted-foreground text-xs">
				{product.defaultSupplier
					? `${product.defaultSupplier.name}${product.defaultSupplier.deleted ? " (eliminado)" : ""}`
					: "Sin proveedor"}
			</span>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (product) => (
			<CrudStatusBadge active={product.active} deleted={product.deleted} />
		),
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		className: "w-40",
		cell: (product) => dateFormatter.format(product.updatedAt),
	},
];

export function ProductTable({
	products,
	onEdit,
	onPreview,
	onSoftDelete,
	onHardDelete,
}: {
	products: ProductListItem[];
	onEdit: (product: ProductListItem) => void;
	onPreview: (product: ProductListItem) => void;
	onSoftDelete: (product: ProductListItem) => void;
	onHardDelete: (product: ProductListItem) => void;
}) {
	const actions: CrudRowAction<ProductListItem>[] = [
		{
			label: "Preview",
			icon: EyeIcon,
			onSelect: onPreview,
		},
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
			disabled: (product) => product.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (product) => product.deleted,
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
			actions={(product) => <CrudRowActions actions={actions} item={product} />}
			columns={productColumns}
			getRowAriaLabel={(product) => `Editar producto ${product.name}`}
			getRowClassName={(product) =>
				product.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(product) => product.id}
			isRowClickDisabled={(product) => product.deleted}
			items={products}
			onRowClick={onEdit}
		/>
	);
}
