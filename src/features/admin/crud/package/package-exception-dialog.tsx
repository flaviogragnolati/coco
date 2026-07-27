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
import type { PackageDetail } from "~/shared/common/admin-crud/package.types";

/**
 * Serves both `markDelayed` and `markFailed`, exactly as its shipment sibling
 * does. It exists at package level so a single lost box does not force failing an
 * otherwise-fine shipment.
 */
export function PackageExceptionDialog({
	open,
	pkg,
	target,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	pkg?: PackageDetail;
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
	const liveLines =
		pkg?.packageLines.filter((line) => line.status !== "cancelled") ?? [];

	return (
		<CrudFormDialogShell
			description={
				isFailure
					? "El paquete queda fallido sin tocar el resto del envío. Después hay que darlo de baja."
					: "El paquete queda demorado sin tocar el resto del envío."
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
					? `Marcar fallido ${pkg?.name ?? "paquete"}`
					: `Marcar demorado ${pkg?.name ?? "paquete"}`
			}
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="package-exception-reason">Motivo</FieldLabel>
					<Textarea
						id="package-exception-reason"
						onChange={(event) => setReason(event.target.value)}
						placeholder={
							isFailure
								? "Por qué el paquete no va a llegar"
								: "Por qué el paquete se demora"
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
				{liveLines.length === 0 ? (
					<p className="text-muted-foreground text-xs">Sin líneas activas.</p>
				) : (
					liveLines.flatMap((line) =>
						line.packageAllocations.map((allocation) => (
							<span
								className="text-muted-foreground text-xs"
								key={allocation.id}
							>
								{allocation.demandAllocation.cartItem.code} —{" "}
								{allocation.quantity} —{" "}
								{allocation.demandAllocation.cartItem.cart.user.name}
							</span>
						)),
					)
				)}
			</section>
		</CrudFormDialogShell>
	);
}
