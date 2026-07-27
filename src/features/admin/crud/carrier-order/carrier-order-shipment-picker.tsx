"use client";

import { Button } from "~/components/ui/button";
import {
	shipmentStatusLabelMap,
	shipmentTypeLabelMap,
} from "~/features/admin/crud/shipment/shipment.mappers";
import { api } from "~/trpc/react";

/**
 * Picks from the shipments that are not on any carrier order yet. Shared by the
 * create form and the add-shipments dialog so both offer the same candidates.
 *
 * It deliberately does not filter cancelled shipments client-side — the server's
 * `loadAssignableShipments` owns that rule, and a second copy here would be one
 * more thing to keep in step.
 */
export function CarrierOrderShipmentPicker({
	selectedIds,
	onToggle,
}: {
	selectedIds: number[];
	onToggle: (shipmentId: number) => void;
}) {
	const listQuery = api.admin.shipment.list.useQuery({
		page: 1,
		pageSize: 50,
		sortDirection: "desc",
		diagnosticState: "all",
		unassigned: true,
	});

	const shipments = listQuery.data?.items ?? [];

	return (
		<section className="flex flex-col gap-2 rounded-2xl border p-3">
			<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
				Envíos sin orden de transporte
			</h3>
			{listQuery.isLoading ? (
				<p className="text-muted-foreground text-xs">Cargando envíos…</p>
			) : null}
			{listQuery.isError ? (
				<p className="text-destructive text-xs">{listQuery.error.message}</p>
			) : null}
			{!listQuery.isLoading && shipments.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					No hay envíos sin orden de transporte.
				</p>
			) : null}
			{shipments.map((shipment) => {
				const selected = selectedIds.includes(shipment.id);

				return (
					<div
						className="flex items-center justify-between gap-2"
						key={shipment.id}
					>
						<div className="flex flex-col">
							<span className="font-medium text-xs">
								{shipment.internalCode} · {shipment.name}
							</span>
							<span className="text-muted-foreground text-xs">
								{shipmentTypeLabelMap[shipment.type]} ·{" "}
								{shipmentStatusLabelMap[shipment.status]} ·{" "}
								{shipment.packageCount} paquetes
							</span>
						</div>
						<Button
							onClick={() => onToggle(shipment.id)}
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
