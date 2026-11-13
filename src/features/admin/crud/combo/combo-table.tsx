"use client";

import {
	ArchiveXIcon,
	PencilIcon,
	Trash2Icon,
	TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";

import { CrudRowActions } from "~/features/admin/crud/_components/crud-row-actions";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type { ComboListItem } from "~/shared/common/admin-crud/combo.types";
import type {
	CrudColumn,
	CrudRowAction,
} from "~/shared/common/admin-crud/crud.types";

function ComboWarnings({ combo }: { combo: ComboListItem }) {
	if (combo.deleted) return null;
	const notShown = combo.active && !combo.shownOnHome;
	if (combo.unavailableProductNames.length === 0 && !notShown) return null;

	return (
		<ul className="mt-1 flex flex-col gap-0.5 text-warning text-xs">
			{combo.unavailableProductNames.length > 0 ? (
				<li className="flex items-center gap-1">
					<TriangleAlertIcon aria-hidden className="size-3.5 shrink-0" />
					Sin precio vigente: {combo.unavailableProductNames.join(", ")}
				</li>
			) : null}
			{notShown ? (
				<li className="flex items-center gap-1">
					<TriangleAlertIcon aria-hidden className="size-3.5 shrink-0" />
					<Link
						className="underline underline-offset-2"
						href="/admin/home-offers"
						onClick={(event) => event.stopPropagation()}
					>
						No se ve en el home
					</Link>
				</li>
			) : null}
		</ul>
	);
}

const comboColumns: CrudColumn<ComboListItem>[] = [
	{
		key: "id",
		header: "ID",
		className: "w-20 font-mono",
		cell: (combo) => combo.id,
	},
	{
		key: "name",
		header: "Nombre",
		cell: (combo) => (
			<div className="flex flex-col">
				<span className="font-medium text-foreground">{combo.name}</span>
				<ComboWarnings combo={combo} />
			</div>
		),
	},
	{
		key: "groupName",
		header: "Grupo",
		cell: (combo) => (
			<span className="text-muted-foreground">{combo.groupName ?? "—"}</span>
		),
	},
	{
		key: "people",
		header: "Personas",
		className: "w-24",
		cell: (combo) => (
			<span className="text-muted-foreground">{combo.people ?? "—"}</span>
		),
	},
	{
		key: "itemCount",
		header: "Productos",
		className: "w-24",
		cell: (combo) => (
			<span className="text-muted-foreground">{combo.itemCount}</span>
		),
	},
	{
		key: "status",
		header: "Estado",
		cell: (combo) => (
			<CrudStatusBadge active={combo.active} deleted={combo.deleted} />
		),
	},
];

export function ComboTable({
	combos,
	onEdit,
	onSoftDelete,
	onHardDelete,
}: {
	combos: ComboListItem[];
	onEdit: (combo: ComboListItem) => void;
	onSoftDelete: (combo: ComboListItem) => void;
	onHardDelete: (combo: ComboListItem) => void;
}) {
	const actions: CrudRowAction<ComboListItem>[] = [
		{
			label: "Editar",
			icon: PencilIcon,
			onSelect: onEdit,
			disabled: (combo) => combo.deleted,
		},
		{
			label: "Enviar a papelera",
			icon: ArchiveXIcon,
			onSelect: onSoftDelete,
			disabled: (combo) => combo.deleted,
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
			actions={(combo) => <CrudRowActions actions={actions} item={combo} />}
			columns={comboColumns}
			getRowAriaLabel={(combo) => `Editar combo ${combo.name}`}
			getRowClassName={(combo) =>
				combo.deleted ? "bg-muted/30 text-muted-foreground" : undefined
			}
			getRowKey={(combo) => combo.id}
			isRowClickDisabled={(combo) => combo.deleted}
			items={combos}
			onRowClick={onEdit}
		/>
	);
}
