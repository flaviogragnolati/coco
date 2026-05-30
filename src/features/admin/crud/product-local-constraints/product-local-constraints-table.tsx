"use client";

import { ArchiveXIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type { ProductLocalConstraintsListItem } from "~/shared/common/admin-crud/product-local-constraints.types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const constraintTypeLabel: Record<string, string> = {
	legal_restriction: "Legal",
	max_quantity: "Maximo",
	minimum_stock: "Stock minimo",
	requires_internal_delivery: "Entrega interna",
	restricted_destination: "Destino restringido",
	seasonal_availability: "Estacional",
};

const productLocalConstraintsColumns: CrudColumn<ProductLocalConstraintsListItem>[] =
	[
		{
			key: "id",
			header: "ID",
			className: "w-20 font-mono",
			cell: (constraint) => constraint.id,
		},
		{
			key: "product",
			header: "Producto",
			cell: (constraint) => (
				<div className="flex flex-col gap-0.5">
					<span className="font-medium text-foreground">
						{constraint.product.name}
					</span>
					<span className="text-muted-foreground text-xs">
						{constraint.product.unit}
						{constraint.product.deleted ? " (eliminado)" : ""}
					</span>
				</div>
			),
		},
		{
			key: "constraintType",
			header: "Tipo",
			cell: (constraint) => (
				<span className="text-muted-foreground text-xs">
					{constraint.constraintType
						? constraintTypeLabel[constraint.constraintType]
						: "Sin tipo"}
				</span>
			),
		},
		{
			key: "reason",
			header: "Motivo",
			cell: (constraint) => (
				<span className="line-clamp-2 text-muted-foreground text-xs">
					{constraint.reason || "Sin motivo"}
				</span>
			),
		},
		{
			key: "status",
			header: "Estado",
			cell: (constraint) => (
				<CrudStatusBadge
					active={constraint.active}
					deleted={constraint.deleted}
				/>
			),
		},
		{
			key: "fromDate",
			header: "Vigencia",
			className: "w-44",
			cell: (constraint) => (
				<span className="text-muted-foreground text-xs">
					{dateFormatter.format(constraint.fromDate)}
					{constraint.toDate
						? ` - ${dateFormatter.format(constraint.toDate)}`
						: ""}
				</span>
			),
		},
		{
			key: "updatedAt",
			header: "Actualizado",
			className: "w-40",
			cell: (constraint) => dateFormatter.format(constraint.updatedAt),
		},
	];

export function ProductLocalConstraintsTable({
	constraints,
	onEdit,
	onSoftDelete,
	onHardDelete,
}: {
	constraints: ProductLocalConstraintsListItem[];
	onEdit: (constraint: ProductLocalConstraintsListItem) => void;
	onSoftDelete: (constraint: ProductLocalConstraintsListItem) => void;
	onHardDelete: (constraint: ProductLocalConstraintsListItem) => void;
}) {
	const actions: CrudRowAction<ProductLocalConstraintsListItem>[] = [
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
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
			actions={(item) => <CrudRowActions actions={actions} item={item} />}
			columns={productLocalConstraintsColumns}
			getRowClassName={(item) =>
				item.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(item) => item.id}
			items={constraints}
		/>
	);
}
