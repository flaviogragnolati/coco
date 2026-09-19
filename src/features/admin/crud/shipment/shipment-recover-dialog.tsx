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
import { shipmentStatusLabelMap } from "./shipment.mappers";

/**
 * Undoes a shipment delay. The target is **read from the server**
 * (`recoveryTarget`), never recomputed here, so the dialog states the rule the
 * command applies.
 */
export function ShipmentRecoverDialog({
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

	const target = shipment?.recoveryTarget ?? null;

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
						disabled={isSubmitting || target === null}
						onClick={() =>
							onSubmit({
								notes: notes.trim().length > 0 ? notes.trim() : undefined,
							})
						}
						type="button"
					>
						Recuperar envío
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Recuperar ${shipment?.internalCode ?? "envío"}`}
		>
			{target === null ? (
				<p className="text-destructive text-xs">
					Solo se puede recuperar un envío demorado.
				</p>
			) : (
				<>
					<p className="text-sm">
						El envío vuelve a <strong>{shipmentStatusLabelMap[target]}</strong>.
					</p>
					<CrudEffectsPanel
						disclosure={resolveDisclosure(shipmentDisclosures.recover, {
							shipment,
						})}
					/>
				</>
			)}

			<Field>
				<FieldLabel htmlFor="shipment-recover-notes">Notas</FieldLabel>
				<Textarea
					id="shipment-recover-notes"
					onChange={(event) => setNotes(event.target.value)}
					rows={3}
					value={notes}
				/>
				<FieldDescription>
					Opcional. Queda en la auditoría y en el tracking del item; el cliente
					no la ve.
				</FieldDescription>
			</Field>
		</CrudFormDialogShell>
	);
}
