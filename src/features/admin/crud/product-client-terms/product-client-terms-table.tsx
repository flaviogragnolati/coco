"use client";

import { ArchiveXIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";
import type { ProductClientTermsListItem } from "~/shared/common/admin-crud/product-client-terms.types";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

const productClientTermsColumns: CrudColumn<ProductClientTermsListItem>[] = [
	{
		key: "id",
		header: "ID",
		className: "w-20 font-mono",
		cell: (terms) => terms.id,
	},
	{
		key: "product",
		header: "Producto",
		cell: (terms) => (
			<div className="flex flex-col gap-0.5">
				<span className="font-medium text-foreground">
					{terms.product.name}
				</span>
				<span className="text-muted-foreground text-xs">
					{terms.product.unit}
					{terms.product.deleted ? " (eliminado)" : ""}
				</span>
			</div>
		),
	},
	{
		key: "moq",
		header: "MOQ",
		cell: (terms) => (
			<span className="font-mono text-xs">
				{terms.moq} / {terms.moqPrice} {terms.currency}
			</span>
		),
	},
	{
		key: "step",
		header: "Step",
		cell: (terms) => (
			<span className="text-muted-foreground text-xs">
				{terms.step ? `${terms.step} / ${terms.stepPrice ?? "-"} ` : "Sin step"}
			</span>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (terms) => (
			<CrudStatusBadge active={terms.active} deleted={terms.deleted} />
		),
	},
	{
		key: "fromDate",
		header: "Vigencia",
		className: "w-44",
		cell: (terms) => (
			<span className="text-muted-foreground text-xs">
				{dateFormatter.format(terms.fromDate)}
				{terms.toDate ? ` - ${dateFormatter.format(terms.toDate)}` : ""}
			</span>
		),
	},
	{
		key: "updatedAt",
		header: "Actualizado",
		className: "w-40",
		cell: (terms) => dateFormatter.format(terms.updatedAt),
	},
];

export function ProductClientTermsTable({
	terms,
	onEdit,
	onSoftDelete,
	onHardDelete,
}: {
	terms: ProductClientTermsListItem[];
	onEdit: (terms: ProductClientTermsListItem) => void;
	onSoftDelete: (terms: ProductClientTermsListItem) => void;
	onHardDelete: (terms: ProductClientTermsListItem) => void;
}) {
	const actions: CrudRowAction<ProductClientTermsListItem>[] = [
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
			columns={productClientTermsColumns}
			getRowClassName={(item) =>
				item.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(item) => item.id}
			items={terms}
		/>
	);
}
