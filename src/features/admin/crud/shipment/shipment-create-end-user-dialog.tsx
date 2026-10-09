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
import { CrudEffectsPanel } from "~/features/admin/crud/_components/crud-effects-panel";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { resolveDisclosure } from "~/features/admin/crud/_lib/fulfillment-effects";
import { deliveryModeLabelMap } from "~/features/admin/crud/shipment/shipment.mappers";
import type { PackageListItem } from "~/shared/common/admin-crud/package.types";
import type { DeliveryMode } from "~/shared/common/admin-crud/shipment.types";
import { api } from "~/trpc/react";
import type { OutboundPackageGroup } from "./outbound-package-groups";
import { OutboundPackagePicker } from "./outbound-package-picker";
import { shipmentDisclosures } from "./shipment.effects";

/**
 * Builds an end-user delivery from packed outbound packages. Depot pickup is
 * deliberately not offered: it is the absence of a shipment, confirmed straight
 * on the package.
 *
 * The one-cart rule for `homeDelivery` and the match against each customer's
 * chosen delivery are enforced server-side; this only pre-fills the mode and
 * point from the packages picked, so the button and the command can never
 * disagree.
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
		pickupPointId?: number;
		packageIds: number[];
	}) => void;
}) {
	// Inactive and trashed points still serve the orders that chose them.
	const pickupPointsQuery = api.admin.pickupPoint.list.useQuery(
		{ includeDeleted: true },
		{ enabled: open },
	);
	const [name, setName] = useState("");
	const [internalCode, setInternalCode] = useState("");
	const [trackingCode, setTrackingCode] = useState("");
	const [deliveryMode, setDeliveryMode] =
		useState<DeliveryMode>("homeDelivery");
	const [pickupPointId, setPickupPointId] = useState<number | null>(null);
	const [packageIds, setPackageIds] = useState<number[]>([]);

	useEffect(() => {
		if (!open) return;
		setName("");
		setInternalCode("");
		setTrackingCode("");
		setDeliveryMode("homeDelivery");
		setPickupPointId(null);
		setPackageIds([]);
	}, [open]);

	const prefill = (
		delivery: { mode: DeliveryMode; pickupPointId: number | null } | null,
	) => {
		if (!delivery) return;
		setDeliveryMode(delivery.mode);
		setPickupPointId(delivery.pickupPointId);
	};

	const togglePackage = (pkg: PackageListItem) => {
		if (packageIds.includes(pkg.id)) {
			setPackageIds(packageIds.filter((id) => id !== pkg.id));
			return;
		}
		if (packageIds.length === 0 && pkg.order?.deliveryPreference) {
			prefill({
				mode: pkg.order.deliveryPreference,
				pickupPointId: pkg.order.pickupPointId,
			});
		}
		setPackageIds([...packageIds, pkg.id]);
	};

	const selectGroup = (group: OutboundPackageGroup) => {
		prefill(group.delivery);
		setPackageIds(group.packages.map((pkg) => pkg.id));
	};

	const pickupPoints = pickupPointsQuery.data ?? [];
	const canSubmit =
		name.trim().length > 0 &&
		internalCode.trim().length > 0 &&
		packageIds.length > 0 &&
		(deliveryMode === "homeDelivery" || pickupPointId !== null);

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
								pickupPointId:
									deliveryMode === "pickupPoint" && pickupPointId !== null
										? pickupPointId
										: undefined,
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
							? "A domicilio: un único cliente, porque el envío lleva una sola dirección, la de su pedido."
							: "Punto de retiro: puede agrupar varios clientes, cada uno retira por separado."}{" "}
						Cada pedido tiene que haber elegido esta entrega.
					</FieldDescription>
				</Field>
				{deliveryMode === "pickupPoint" ? (
					<Field>
						<FieldLabel htmlFor="end-user-shipment-pickup-point">
							Punto de retiro
						</FieldLabel>
						<Select
							id="end-user-shipment-pickup-point"
							onChange={(event) =>
								setPickupPointId(
									event.target.value ? Number(event.target.value) : null,
								)
							}
							value={pickupPointId ?? ""}
						>
							<option value="">Elegí un punto</option>
							{pickupPoints.map((point) => (
								<option key={point.id} value={point.id}>
									{point.deleted
										? `${point.name} (eliminado)`
										: point.active
											? point.name
											: `${point.name} (inactivo)`}
								</option>
							))}
						</Select>
						<FieldDescription>
							El destino del envío se copia del punto elegido.
						</FieldDescription>
					</Field>
				) : null}
			</FieldGroup>

			<OutboundPackagePicker
				onSelectGroup={selectGroup}
				onToggle={togglePackage}
				selectedIds={packageIds}
			/>

			{/* Resolved against the current selection, so the counts move as packages
			    are picked. */}
			<CrudEffectsPanel
				disclosure={resolveDisclosure(shipmentDisclosures.createEndUser, {
					selection: { packageCount: packageIds.length },
				})}
			/>
		</CrudFormDialogShell>
	);
}
