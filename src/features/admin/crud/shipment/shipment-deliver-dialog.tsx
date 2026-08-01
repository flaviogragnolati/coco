"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import { CrudEffectsPanel } from "~/features/admin/crud/_components/crud-effects-panel";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { resolveDisclosure } from "~/features/admin/crud/_lib/fulfillment-effects";
import type { ShipmentDetail } from "~/shared/common/admin-crud/shipment.types";
import { shipmentDisclosures } from "./shipment.effects";

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
			{/* The two modes differ in exactly one way, and it is the reason the
			    column exists — the panel states which one applies. */}
			<CrudEffectsPanel
				disclosure={resolveDisclosure(shipmentDisclosures.deliver, {
					shipment,
				})}
			/>

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
