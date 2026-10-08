"use client";

import { Button } from "~/components/ui/button";
import { DateTooltip } from "~/features/admin/crud/_components/crud-cell-tooltips";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";
import type { SupplierApplicationListItem } from "~/shared/common/admin-crud/supplier-application.types";
import {
	supplierApplicationStatusConfig,
	supplierApplicationStatusOf,
} from "./supplier-application.mappers";

function buildColumns(
	onMarkContacted: (application: SupplierApplicationListItem) => void,
): CrudColumn<SupplierApplicationListItem>[] {
	return [
		{
			key: "company",
			header: "Empresa",
			className: "min-w-44",
			cell: (application) => (
				<div className="flex flex-col gap-1">
					<span className="font-medium">{application.companyName}</span>
					<span className="text-muted-foreground text-xs">
						{application.contactName}
					</span>
				</div>
			),
		},
		{
			key: "contact",
			header: "Contacto",
			className: "min-w-44",
			cell: (application) => (
				<div className="flex flex-col gap-1 text-xs">
					{application.email ? (
						<a
							className="underline-offset-4 hover:underline"
							href={`mailto:${application.email}`}
						>
							{application.email}
						</a>
					) : null}
					{application.phone ? (
						<a
							className="underline-offset-4 hover:underline"
							href={`tel:${application.phone.replace(/[^\d+]/g, "")}`}
						>
							{application.phone}
						</a>
					) : null}
				</div>
			),
		},
		{
			key: "offering",
			header: "Qué ofrece",
			className: "min-w-72",
			cell: (application) => (
				<p className="whitespace-pre-line text-xs">{application.offering}</p>
			),
		},
		{
			key: "status",
			header: "Estado",
			className: "min-w-36",
			cell: (application) => (
				<div className="flex flex-col gap-1">
					<StatusChip
						config={
							supplierApplicationStatusConfig[
								supplierApplicationStatusOf(application)
							]
						}
					/>
					{application.contactedAt ? (
						<span className="text-muted-foreground text-xs">
							{application.contactedBy?.name ?? "Admin eliminado"} ·{" "}
							<DateTooltip value={application.contactedAt} />
						</span>
					) : null}
				</div>
			),
		},
		{
			key: "createdAt",
			header: "Recibida",
			cell: (application) => (
				<DateTooltip className="text-xs" value={application.createdAt} />
			),
		},
		{
			key: "actions",
			header: "Acciones",
			cell: (application) =>
				application.contactedAt ? null : (
					<Button
						onClick={() => onMarkContacted(application)}
						size="sm"
						type="button"
						variant="outline"
					>
						Marcar como contactada
					</Button>
				),
		},
	];
}

export function SupplierApplicationTable({
	applications,
	onMarkContacted,
}: {
	applications: SupplierApplicationListItem[];
	onMarkContacted: (application: SupplierApplicationListItem) => void;
}) {
	return (
		<CrudTable
			columns={buildColumns(onMarkContacted)}
			getRowKey={(application) => application.id}
			items={applications}
		/>
	);
}
