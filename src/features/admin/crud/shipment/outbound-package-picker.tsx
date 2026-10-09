"use client";

import { Button } from "~/components/ui/button";
import type { PackageListItem } from "~/shared/common/admin-crud/package.types";
import { api } from "~/trpc/react";
import {
	groupOutboundPackages,
	type OutboundPackageGroup,
} from "./outbound-package-groups";

function customerLine(pkg: PackageListItem) {
	if (pkg.order) return `${pkg.order.customerName} · ${pkg.order.orderCode}`;
	if (pkg.orderCount > 1) return `${pkg.orderCount} pedidos`;
	return "Sin pedido";
}

/**
 * Picks from the outbound packages that are packed and not yet on any shipment —
 * exactly the shape `createOutboundPackage` produces and `createEndUser` accepts.
 * Shared by the create and add-packages dialogs so both offer the same candidates,
 * grouped by the delivery each customer chose.
 */
export function OutboundPackagePicker({
	selectedIds,
	onToggle,
	onSelectGroup,
}: {
	selectedIds: number[];
	onToggle: (pkg: PackageListItem) => void;
	onSelectGroup: (group: OutboundPackageGroup) => void;
}) {
	const listQuery = api.admin.package.list.useQuery({
		page: 1,
		pageSize: 50,
		sortDirection: "desc",
		diagnosticState: "all",
		leg: "outbound",
		status: "readyForShipment",
		unassigned: true,
	});

	const groups = groupOutboundPackages(listQuery.data?.items ?? []);

	return (
		<section className="flex flex-col gap-3 rounded-2xl border p-3">
			<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				Paquetes de salida sin envío
			</h3>
			{listQuery.isLoading ? (
				<p className="text-muted-foreground text-xs">Cargando paquetes…</p>
			) : null}
			{listQuery.isError ? (
				<p className="text-destructive text-xs">{listQuery.error.message}</p>
			) : null}
			{!listQuery.isLoading && groups.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					No hay paquetes de salida listos para enviar.
				</p>
			) : null}
			{groups.map((group) => (
				<div className="flex flex-col gap-2" key={group.key}>
					<div className="flex items-center justify-between gap-2">
						<span className="font-medium text-xs">{group.label}</span>
						<Button
							onClick={() => onSelectGroup(group)}
							size="sm"
							type="button"
							variant="ghost"
						>
							Seleccionar grupo
						</Button>
					</div>
					{group.packages.map((pkg) => {
						const selected = selectedIds.includes(pkg.id);

						return (
							<div
								className="flex items-center justify-between gap-2 pl-2"
								key={pkg.id}
							>
								<div className="flex flex-col">
									<span className="font-medium text-xs">
										#{pkg.id} {pkg.name}
									</span>
									<span className="text-muted-foreground text-xs">
										{customerLine(pkg)} · {pkg.packageLineCount} líneas ·{" "}
										{pkg.packageLineQuantity}
									</span>
								</div>
								<Button
									onClick={() => onToggle(pkg)}
									size="sm"
									type="button"
									variant={selected ? "default" : "outline"}
								>
									{selected ? "Quitar" : "Agregar"}
								</Button>
							</div>
						);
					})}
				</div>
			))}
		</section>
	);
}
