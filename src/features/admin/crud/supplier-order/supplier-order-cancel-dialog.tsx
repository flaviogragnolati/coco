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
import type { SupplierOrderDetail } from "~/shared/common/admin-crud/supplier-order.types";

type SupplierOrderLotItem =
	SupplierOrderDetail["lots"][number]["lotItems"][number];

/**
 * Serves both `cancel` and `cancelLine`: passing a `lotItem` switches the copy
 * and the target, everything else — the mandatory reason, the roll over warning
 * — is identical.
 */
export function SupplierOrderCancelDialog({
	open,
	supplierOrder,
	lotItem,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	supplierOrder?: SupplierOrderDetail;
	lotItem?: SupplierOrderLotItem;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: { reason: string }) => void;
}) {
	const [reason, setReason] = useState("");

	useEffect(() => {
		if (open) setReason("");
	}, [open]);

	const isLine = lotItem !== undefined;
	const affectedLines = isLine
		? [lotItem]
		: (supplierOrder?.lots.flatMap((lot) =>
				lot.lotItems.filter((item) => item.status !== "cancelled"),
			) ?? []);

	return (
		<CrudFormDialogShell
			description={
				isLine
					? "La línea se cancela y su demanda vuelve a rollover para reagruparse en una operación futura."
					: "La orden, sus lotes y sus líneas se cancelan; toda la demanda activa vuelve a rollover."
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
						{isLine ? "Cancelar línea" : "Cancelar orden"}
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={
				isLine
					? `Cancelar línea ${lotItem.code}`
					: `Cancelar ${supplierOrder?.code ?? "orden de proveedor"}`
			}
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="supplier-order-cancel-reason">Motivo</FieldLabel>
					<Textarea
						id="supplier-order-cancel-reason"
						onChange={(event) => setReason(event.target.value)}
						placeholder="Por qué el proveedor no puede cumplir"
						rows={3}
						value={reason}
					/>
					<FieldDescription>
						Obligatorio. Queda en la auditoría y en el rollover generado.
					</FieldDescription>
				</Field>
			</FieldGroup>

			<section className="flex flex-col gap-2 rounded-2xl border p-3">
				<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Demanda que vuelve a rollover
				</h3>
				{affectedLines.length === 0 ? (
					<p className="text-muted-foreground text-xs">Sin líneas activas.</p>
				) : (
					affectedLines.map((line) => (
						<div className="flex flex-col gap-1 text-xs" key={line.id}>
							<span className="font-medium">
								{line.code} · {line.product.name}
							</span>
							{line.demandAllocations.map((allocation) => (
								<span className="text-muted-foreground" key={allocation.id}>
									{allocation.cartItem.cart.code} / {allocation.cartItem.code} —{" "}
									{allocation.quantity}
								</span>
							))}
						</div>
					))
				)}
			</section>
		</CrudFormDialogShell>
	);
}
