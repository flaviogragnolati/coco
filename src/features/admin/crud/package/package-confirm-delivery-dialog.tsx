"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import type { PackageDetail } from "~/shared/common/admin-crud/package.types";

/**
 * The per-package handover: depot pickup, pickup-point collection, or a delayed
 * package that turned up and was handed over. It never touches the shipment —
 * one customer collecting says nothing about the rest of the route.
 */
export function PackageConfirmDeliveryDialog({
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

	const liveLines =
		pkg?.packageLines.filter((line) => line.status !== "cancelled") ?? [];
	const customer = liveLines.flatMap((line) => line.packageAllocations).at(0)
		?.demandAllocation.cartItem.cart;

	return (
		<CrudFormDialogShell
			description={
				pkg?.shipment
					? "Se registra el retiro de este paquete. El envío no cambia: cada cliente retira por separado."
					: "Se registra la entrega en depósito. El paquete pasa a recibido sin haber viajado."
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
						disabled={isSubmitting || liveLines.length === 0}
						onClick={() =>
							onSubmit({
								notes: notes.trim().length > 0 ? notes.trim() : undefined,
							})
						}
						type="button"
					>
						Confirmar entrega
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Confirmar entrega de ${pkg?.name ?? "paquete"}`}
		>
			<section className="flex flex-col gap-2 rounded-2xl border p-3">
				<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Cliente
				</h3>
				<p className="text-xs">
					{customer
						? `${customer.code} — ${customer.user.name}`
						: "Sin asignaciones activas"}
				</p>
				<h3 className="mt-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Contenido
				</h3>
				{liveLines.length === 0 ? (
					<p className="text-muted-foreground text-xs">Sin líneas activas.</p>
				) : (
					liveLines.map((line) => (
						<span className="text-muted-foreground text-xs" key={line.id}>
							{line.lotItem.code} · {line.lotItem.product.name} —{" "}
							{line.quantity} {line.lotItem.product.unit}
						</span>
					))
				)}
			</section>

			<Field>
				<FieldLabel htmlFor="package-confirm-delivery-notes">Notas</FieldLabel>
				<Textarea
					id="package-confirm-delivery-notes"
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
