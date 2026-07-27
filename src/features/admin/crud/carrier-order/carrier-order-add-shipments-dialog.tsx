"use client";

import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import type { CarrierOrderDetail } from "~/shared/common/admin-crud/carrier-order.types";
import { CarrierOrderShipmentPicker } from "./carrier-order-shipment-picker";

export function CarrierOrderAddShipmentsDialog({
	open,
	carrierOrder,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	carrierOrder?: CarrierOrderDetail;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: { shipmentIds: number[] }) => void;
}) {
	const [shipmentIds, setShipmentIds] = useState<number[]>([]);

	useEffect(() => {
		if (open) setShipmentIds([]);
	}, [open]);

	const toggle = (shipmentId: number) => {
		setShipmentIds((current) =>
			current.includes(shipmentId)
				? current.filter((id) => id !== shipmentId)
				: [...current, shipmentId],
		);
	};

	return (
		<CrudFormDialogShell
			description="Los envíos seleccionados pasan a viajar bajo esta orden. El estado de cada envío no cambia."
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
						disabled={isSubmitting || shipmentIds.length === 0}
						onClick={() => onSubmit({ shipmentIds })}
						type="button"
						variant="highlight"
					>
						Agregar envíos
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Agregar envíos a ${carrierOrder?.code ?? "la orden"}`}
		>
			<CarrierOrderShipmentPicker onToggle={toggle} selectedIds={shipmentIds} />
		</CrudFormDialogShell>
	);
}
