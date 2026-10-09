"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import { CrudEffectsPanel } from "~/features/admin/crud/_components/crud-effects-panel";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { resolveDisclosure } from "~/features/admin/crud/_lib/fulfillment-effects";
import type { PackageDetail } from "~/shared/common/admin-crud/package.types";
import { describeDeliveryChoice } from "~/shared/common/delivery-display";
import { packageDisclosures } from "./package.effects";

/**
 * A depot handover is the customer collecting in person, so it needs no change
 * of delivery; the dialog only shows what they had chosen.
 */
function deliveryHint(pkg: PackageDetail | undefined) {
	if (!pkg?.order) return null;
	if (pkg.order.deliveryPreference === null) {
		return "El cliente no eligió entrega (pedido anterior).";
	}
	return `El cliente eligió: ${describeDeliveryChoice({
		mode: pkg.order.deliveryPreference,
		pickupPointName: pkg.order.pickupPointName ?? undefined,
	})}.`;
}

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
	const hint = deliveryHint(pkg);

	return (
		<CrudFormDialogShell
			description={
				pkg?.shipment
					? "Se registra el retiro de este paquete en el punto."
					: "Se registra la entrega en depósito: el paquete llega al cliente sin haber viajado."
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
				{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
			</section>

			<CrudEffectsPanel
				disclosure={resolveDisclosure(packageDisclosures.confirmDelivery, {
					pkg,
				})}
			/>

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
