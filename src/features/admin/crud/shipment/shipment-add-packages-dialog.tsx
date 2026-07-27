"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import type { ShipmentDetail } from "~/shared/common/admin-crud/shipment.types";
import { OutboundPackagePicker } from "./outbound-package-picker";

/** The incremental half of the create dialog: more packages while still assembling. */
export function ShipmentAddPackagesDialog({
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
	onSubmit: (values: { packageIds: number[] }) => void;
}) {
	const [packageIds, setPackageIds] = useState<number[]>([]);

	useEffect(() => {
		if (open) setPackageIds([]);
	}, [open]);

	return (
		<CrudFormDialogShell
			description={
				shipment?.deliveryMode === "homeDelivery"
					? "El envío es a domicilio, así que los paquetes agregados deben ser del mismo cliente."
					: "Los paquetes agregados quedan listos para salir con este envío."
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
						disabled={isSubmitting || packageIds.length === 0}
						onClick={() => onSubmit({ packageIds })}
						type="button"
					>
						Agregar paquetes
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Agregar paquetes a ${shipment?.internalCode ?? "envío"}`}
		>
			<section className="flex flex-col gap-2 rounded-2xl border p-3">
				<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Paquetes actuales
				</h3>
				{(shipment?.packages.length ?? 0) === 0 ? (
					<p className="text-muted-foreground text-xs">Sin paquetes.</p>
				) : (
					shipment?.packages.map((pkg) => (
						<div className="flex justify-between gap-2 text-xs" key={pkg.id}>
							<span className="font-medium">
								#{pkg.id} {pkg.name}
							</span>
							<span className="text-muted-foreground">
								{pkg.lineCount} líneas · {pkg.lineQuantity}
							</span>
						</div>
					))
				)}
			</section>

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
