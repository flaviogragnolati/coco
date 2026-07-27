"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import type { ShipmentDetail } from "~/shared/common/admin-crud/shipment.types";

/**
 * The consequence differs by mode, so the copy states it in plain Spanish: a home
 * delivery is the handover, a pickup-point arrival is not — each customer still
 * confirms their own collection.
 */
export function ShipmentDeliverDialog({
	open,
	shipment,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	shipment?: ShipmentDetail;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: { notes?: string }) => void;
}) {
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (open) setNotes("");
	}, [open]);

	const packages = shipment?.packages ?? [];
	const isHomeDelivery = shipment?.deliveryMode === "homeDelivery";

	return (
		<CrudFormDialogShell
			description={
				isHomeDelivery
					? `Se confirmará la entrega de ${packages.length} paquete(s). La demanda afectada pasa a entregada.`
					: "El envío llegará al punto de retiro; cada cliente confirma su retiro por separado desde su paquete."
			}
			footer={
				<>
					<Button
						disabled={isSubmitting}
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Volver
					</Button>
					<Button
						disabled={isSubmitting || packages.length === 0}
						onClick={() =>
							onSubmit({
								notes: notes.trim().length > 0 ? notes.trim() : undefined,
							})
						}
						type="button"
					>
						{isHomeDelivery ? "Confirmar entrega" : "Confirmar llegada"}
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Entregar ${shipment?.internalCode ?? "envío"}`}
		>
			<section className="flex flex-col gap-2 rounded-2xl border p-3">
				<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Paquetes del envío
				</h3>
				{packages.length === 0 ? (
					<p className="text-muted-foreground text-xs">Sin paquetes.</p>
				) : (
					packages.map((pkg) => (
						<div className="flex justify-between gap-2 text-xs" key={pkg.id}>
							<span className="font-medium">
								#{pkg.id} {pkg.name}
							</span>
							<span className="text-muted-foreground">
								{pkg.lineCount} líneas · {pkg.lineQuantity}
							</span>
						</div>
					))
				)}
			</section>

			<Field>
				<FieldLabel htmlFor="shipment-deliver-notes">Notas</FieldLabel>
				<Textarea
					id="shipment-deliver-notes"
					onChange={(event) => setNotes(event.target.value)}
					rows={3}
					value={notes}
				/>
				<FieldDescription>
					Opcional. Queda registrada en la auditoría de la entrega.
				</FieldDescription>
			</Field>
		</CrudFormDialogShell>
	);
}
