"use client";

import { Button } from "~/components/ui/button";
import { CrudEffectsPanel } from "~/features/admin/crud/_components/crud-effects-panel";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { resolveDisclosure } from "~/features/admin/crud/_lib/fulfillment-effects";
import type { ShipmentDetail } from "~/shared/common/admin-crud/shipment.types";
import { shipmentDisclosures } from "./shipment.effects";

/**
 * Confirming departure takes no input — it is the second half of the two-step
 * dispatch, which exists so `packaged` is observable before the goods move.
 */
export function ShipmentDispatchDialog({
	open,
	shipment,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	shipment?: ShipmentDetail;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: () => void;
}) {
	const packages = shipment?.packages ?? [];

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
						disabled={isSubmitting || packages.length === 0}
						onClick={onSubmit}
						type="button"
					>
						Confirmar salida
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Despachar ${shipment?.internalCode ?? "envío"}`}
		>
			<CrudEffectsPanel
				disclosure={resolveDisclosure(shipmentDisclosures.dispatch, {
					shipment,
				})}
			/>
		</CrudFormDialogShell>
	);
}
