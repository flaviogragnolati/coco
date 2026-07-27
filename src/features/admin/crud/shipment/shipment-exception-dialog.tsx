"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import type { ShipmentDetail } from "~/shared/common/admin-crud/shipment.types";

/**
 * Serves both `markDelayed` and `markFailed`: the target switches the copy and
 * the follow-up it announces, everything else — the mandatory reason, the
 * exception the affected customers will see — is identical.
 */
export function ShipmentExceptionDialog({
	open,
	shipment,
	target,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	shipment?: ShipmentDetail;
	target: "delayed" | "failed";
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: { reason: string }) => void;
}) {
	const [reason, setReason] = useState("");

	useEffect(() => {
		if (open) setReason("");
	}, [open]);

	const isFailure = target === "failed";

	return (
		<CrudFormDialogShell
			description={
				isFailure
					? "El envío y sus paquetes quedan fallidos. Después hay que reintentar con un envío nuevo o dar de baja los paquetes."
					: "El envío y sus paquetes quedan demorados. Se puede recibir igual cuando llegue, o escalar a fallido."
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
						disabled={isSubmitting || reason.trim().length === 0}
						onClick={() => onSubmit({ reason: reason.trim() })}
						type="button"
						variant="destructive"
					>
						{isFailure ? "Marcar fallido" : "Marcar demorado"}
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={
				isFailure
					? `Marcar fallido ${shipment?.internalCode ?? "envío"}`
					: `Marcar demorado ${shipment?.internalCode ?? "envío"}`
			}
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="shipment-exception-reason">Motivo</FieldLabel>
					<Textarea
						id="shipment-exception-reason"
						onChange={(event) => setReason(event.target.value)}
						placeholder={
							isFailure
								? "Por qué el envío no va a llegar"
								: "Por qué el envío se demora"
						}
						rows={3}
						value={reason}
					/>
					<FieldDescription>
						Obligatorio. Queda en la auditoría y en el aviso que ve cada cliente
						afectado.
					</FieldDescription>
				</Field>
			</FieldGroup>

			<section className="flex flex-col gap-2 rounded-2xl border p-3">
				<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Demanda que pasa a excepción
				</h3>
				{(shipment?.packages ?? []).length === 0 ? (
					<p className="text-muted-foreground text-xs">Sin paquetes.</p>
				) : (
					shipment?.packages.map((pkg) => (
						<div className="flex flex-col gap-1 text-xs" key={pkg.id}>
							<span className="font-medium">{pkg.name}</span>
							{pkg.lines.flatMap((line) =>
								line.allocations.map((allocation) => (
									<span className="text-muted-foreground" key={allocation.id}>
										{allocation.cartItemCode} — {allocation.quantity} —{" "}
										{allocation.userName}
									</span>
								)),
							)}
						</div>
					))
				)}
			</section>
		</CrudFormDialogShell>
	);
}
