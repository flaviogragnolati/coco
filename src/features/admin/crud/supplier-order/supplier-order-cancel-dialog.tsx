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
import { CrudEffectsPanel } from "~/features/admin/crud/_components/crud-effects-panel";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { resolveDisclosure } from "~/features/admin/crud/_lib/fulfillment-effects";
import type { SupplierOrderDetail } from "~/shared/common/admin-crud/supplier-order.types";
import { supplierOrderDisclosures } from "./supplier-order.effects";

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

			{/* One dialog, two commands: the entry is picked by the same flag the copy is. */}
			<CrudEffectsPanel
				disclosure={resolveDisclosure(
					isLine
						? supplierOrderDisclosures.cancelLine
						: supplierOrderDisclosures.cancel,
					{ supplierOrder, lotItem },
				)}
			/>
		</CrudFormDialogShell>
	);
}
