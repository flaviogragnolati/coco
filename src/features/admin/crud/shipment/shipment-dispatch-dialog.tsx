"use client";

import { Button } from "~/components/ui/button";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import type { ShipmentDetail } from "~/shared/common/admin-crud/shipment.types";

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
			description="El envío pasa a en tránsito y sus paquetes con él. La demanda afectada empieza a leerse como en traslado interno."
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
			<section className="flex flex-col gap-2 rounded-2xl border p-3">
				<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Paquetes que salen
				</h3>
				{packages.length === 0 ? (
					<p className="text-muted-foreground text-xs">Sin paquetes.</p>
				) : (
					packages.map((pkg) => (
						<div className="flex justify-between gap-2 text-xs" key={pkg.id}>
							<span className="font-medium">{pkg.name}</span>
							<span className="text-muted-foreground">
								{pkg.lineCount} líneas · {pkg.lineQuantity}
							</span>
						</div>
					))
				)}
			</section>
		</CrudFormDialogShell>
	);
}
