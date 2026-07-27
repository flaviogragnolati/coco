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
import { Select } from "~/components/ui/select";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { deliveryModeLabelMap } from "~/features/admin/crud/shipment/shipment.mappers";
import type { DeliveryMode } from "~/shared/common/admin-crud/shipment.types";
import { OutboundPackagePicker } from "./outbound-package-picker";

/**
 * Builds an end-user delivery from packed outbound packages. Depot pickup is
 * deliberately not offered: it is the absence of a shipment, confirmed straight
 * on the package.
 *
 * The one-cart rule for `homeDelivery` is enforced server-side; this only states
 * it, so the button and the command can never disagree.
 */
export function ShipmentCreateEndUserDialog({
	open,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: {
		name: string;
		internalCode: string;
		trackingCode?: string;
		deliveryMode: DeliveryMode;
		packageIds: number[];
	}) => void;
}) {
	const [name, setName] = useState("");
	const [internalCode, setInternalCode] = useState("");
	const [trackingCode, setTrackingCode] = useState("");
	const [deliveryMode, setDeliveryMode] =
		useState<DeliveryMode>("homeDelivery");
	const [packageIds, setPackageIds] = useState<number[]>([]);

	useEffect(() => {
		if (!open) return;
		setName("");
		setInternalCode("");
		setTrackingCode("");
		setDeliveryMode("homeDelivery");
		setPackageIds([]);
	}, [open]);

	const canSubmit =
		name.trim().length > 0 &&
		internalCode.trim().length > 0 &&
		packageIds.length > 0;

	return (
		<CrudFormDialogShell
			description="El envío se crea listo para despachar con los paquetes seleccionados. Despachar es un paso aparte."
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
						disabled={isSubmitting || !canSubmit}
						onClick={() =>
							onSubmit({
								name: name.trim(),
								internalCode: internalCode.trim(),
								trackingCode:
									trackingCode.trim().length > 0
										? trackingCode.trim()
										: undefined,
								deliveryMode,
								packageIds,
							})
						}
						type="button"
					>
						Crear envío
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title="Nuevo envío al cliente"
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="end-user-shipment-name">Nombre</FieldLabel>
					<Input
						autoComplete="off"
						id="end-user-shipment-name"
						onChange={(event) => setName(event.target.value)}
						value={name}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="end-user-shipment-code">
						Código interno
					</FieldLabel>
					<Input
						autoComplete="off"
						id="end-user-shipment-code"
						onChange={(event) => setInternalCode(event.target.value)}
						value={internalCode}
					/>
					<FieldDescription>Único en el sistema.</FieldDescription>
				</Field>
				<Field>
					<FieldLabel htmlFor="end-user-shipment-tracking">
						Tracking code
					</FieldLabel>
					<Input
						autoComplete="off"
						id="end-user-shipment-tracking"
						onChange={(event) => setTrackingCode(event.target.value)}
						value={trackingCode}
					/>
					<FieldDescription>Opcional.</FieldDescription>
				</Field>
				<Field>
					<FieldLabel htmlFor="end-user-shipment-mode">
						Modo de entrega
					</FieldLabel>
					<Select
						id="end-user-shipment-mode"
						onChange={(event) =>
							setDeliveryMode(event.target.value as DeliveryMode)
						}
						value={deliveryMode}
					>
						<option value="homeDelivery">
							{deliveryModeLabelMap.homeDelivery}
						</option>
						<option value="pickupPoint">
							{deliveryModeLabelMap.pickupPoint}
						</option>
					</Select>
					<FieldDescription>
						{deliveryMode === "homeDelivery"
							? "A domicilio: un único cliente, porque el envío lleva una sola dirección."
							: "Punto de retiro: puede agrupar varios clientes, cada uno retira por separado."}
					</FieldDescription>
				</Field>
			</FieldGroup>

			<OutboundPackagePicker
				onToggle={(packageId) =>
					setPackageIds((current) =>
						current.includes(packageId)
							? current.filter((id) => id !== packageId)
							: [...current, packageId],
					)
				}
				selectedIds={packageIds}
			/>
		</CrudFormDialogShell>
	);
}
