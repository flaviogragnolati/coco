"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { packageStatusLabelMap } from "~/features/admin/crud/package/package.mappers";
import type { PackageDetail } from "~/shared/common/admin-crud/package.types";

/**
 * Undoes a package-level disruption. The target is **read from the server**
 * (`recoveryTarget`), never recomputed here: the rule that a package which never
 * departed goes back to `readyForShipment` and one already travelling goes back
 * `inTransit` has exactly one definition, and the dialog must state that one.
 */
export function PackageRecoverDialog({
	open,
	pkg,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	pkg?: PackageDetail;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: { notes?: string }) => void;
}) {
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (open) setNotes("");
	}, [open]);

	const target = pkg?.recoveryTarget ?? null;

	return (
		<CrudFormDialogShell
			description="El paquete deja de estar demorado y su incidencia se marca como resuelta."
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
						Recuperar paquete
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Recuperar ${pkg?.name ?? "paquete"}`}
		>
			<section className="flex flex-col gap-2 rounded-2xl border p-3">
				<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Estado de destino
				</h3>
				<p className="text-xs">
					{target === null
						? "No se puede recuperar mientras el envío esté demorado o fallido."
						: `Volverá a: ${packageStatusLabelMap[target]}`}
				</p>
				{pkg?.shipment ? (
					<p className="text-muted-foreground text-xs">
						Envío {pkg.shipment.internalCode}
					</p>
				) : (
					<p className="text-muted-foreground text-xs">Sin envío asociado.</p>
				)}
			</section>

			<Field>
				<FieldLabel htmlFor="package-recover-notes">Notas</FieldLabel>
				<Textarea
					id="package-recover-notes"
					onChange={(event) => setNotes(event.target.value)}
					rows={3}
					value={notes}
				/>
				<FieldDescription>
					Opcional. Queda registrada en la auditoría de la recuperación.
				</FieldDescription>
			</Field>
		</CrudFormDialogShell>
	);
}
