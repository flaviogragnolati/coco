"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { CrudEffectsPanel } from "~/features/admin/crud/_components/crud-effects-panel";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { resolveDisclosure } from "~/features/admin/crud/_lib/fulfillment-effects";
import type { SupplierOrderDetail } from "~/shared/common/admin-crud/supplier-order.types";
import { supplierOrderDisclosures } from "./supplier-order.effects";

export function SupplierOrderRequestDialog({
	open,
	supplierOrder,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	supplierOrder?: SupplierOrderDetail;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: { externalReference?: string }) => void;
}) {
	const [externalReference, setExternalReference] = useState("");

	useEffect(() => {
		if (open) setExternalReference(supplierOrder?.externalReference ?? "");
	}, [open, supplierOrder?.externalReference]);

	const liveLines =
		supplierOrder?.lots.flatMap((lot) =>
			lot.lotItems.filter((lotItem) => lotItem.status !== "cancelled"),
		) ?? [];

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
						Cancelar
					</Button>
					<Button
						disabled={isSubmitting || liveLines.length === 0}
						onClick={() =>
							onSubmit({
								externalReference:
									externalReference.trim().length > 0
										? externalReference.trim()
										: undefined,
							})
						}
						type="button"
					>
						Solicitar
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={
				supplierOrder
					? `Solicitar ${supplierOrder.code}`
					: "Solicitar orden de proveedor"
			}
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="supplier-order-external-reference">
						Referencia externa
					</FieldLabel>
					<Input
						autoComplete="off"
						id="supplier-order-external-reference"
						onChange={(event) => setExternalReference(event.target.value)}
						placeholder="Número de pedido del proveedor"
						value={externalReference}
					/>
					<FieldDescription>
						Opcional. Queda registrada en la orden y en la auditoría.
					</FieldDescription>
				</Field>
			</FieldGroup>

			<CrudEffectsPanel
				disclosure={resolveDisclosure(supplierOrderDisclosures.request, {
					supplierOrder,
				})}
			/>
		</CrudFormDialogShell>
	);
}
