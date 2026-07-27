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
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import type { SupplierOrderDetail } from "~/shared/common/admin-crud/supplier-order.types";

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
			description="Se marcará la orden, sus lotes y sus líneas como solicitadas al proveedor."
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

			<section className="flex flex-col gap-2 rounded-2xl border p-3">
				<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Líneas a solicitar ({liveLines.length})
				</h3>
				{liveLines.length === 0 ? (
					<p className="text-muted-foreground text-xs">
						La orden no tiene líneas activas.
					</p>
				) : (
					liveLines.map((lotItem) => (
						<div
							className="flex justify-between gap-2 border-t pt-2 text-xs first:border-t-0 first:pt-0"
							key={lotItem.id}
						>
							<span>
								{lotItem.code} · {lotItem.product.name}
							</span>
							<span>
								{lotItem.quantity} {lotItem.product.unit}
							</span>
						</div>
					))
				)}
			</section>
		</CrudFormDialogShell>
	);
}
