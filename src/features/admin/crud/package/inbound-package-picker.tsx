"use client";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

/**
 * Picks from the received inbound packages — the only shape `fractionate`
 * accepts. Mirrors `OutboundPackagePicker`'s selected-ids/toggle contract rather
 * than adding row selection to the shared `crud-table.tsx`, which has none and
 * would gain it for one dialog's benefit.
 *
 * `excludeId` is the package the dialog was opened on: it is always part of the
 * selection and is listed separately, so it cannot be toggled off by accident.
 */
export function InboundPackagePicker({
	selectedIds,
	excludeId,
	onToggle,
}: {
	selectedIds: number[];
	excludeId?: number;
	onToggle: (packageId: number) => void;
}) {
	const listQuery = api.admin.package.list.useQuery({
		page: 1,
		pageSize: 50,
		sortDirection: "desc",
		diagnosticState: "all",
		leg: "inbound",
		status: "received",
	});

	const packages = (listQuery.data?.items ?? []).filter(
		(pkg) => pkg.id !== excludeId,
	);

	return (
		<section className="flex flex-col gap-2 rounded-2xl border p-3">
			<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				Otros paquetes de entrada recibidos
			</h3>
			{listQuery.isLoading ? (
				<p className="text-muted-foreground text-xs">Cargando paquetes…</p>
			) : null}
			{listQuery.isError ? (
				<p className="text-destructive text-xs">{listQuery.error.message}</p>
			) : null}
			{!listQuery.isLoading && packages.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					No hay otros paquetes de entrada recibidos.
				</p>
			) : null}
			{packages.map((pkg) => {
				const selected = selectedIds.includes(pkg.id);

				return (
					<div className="flex items-center justify-between gap-2" key={pkg.id}>
						<div className="flex flex-col">
							<span className="font-medium text-xs">
								#{pkg.id} {pkg.name}
							</span>
							<span className="text-muted-foreground text-xs">
								{pkg.packageLineCount} líneas · {pkg.packageLineQuantity}
							</span>
						</div>
						<Button
							onClick={() => onToggle(pkg.id)}
							size="sm"
							type="button"
							variant={selected ? "default" : "outline"}
						>
							{selected ? "Quitar" : "Agregar"}
						</Button>
					</div>
				);
			})}
		</section>
	);
}
