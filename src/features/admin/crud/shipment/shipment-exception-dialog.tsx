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
import type { ShipmentDetail } from "~/shared/common/admin-crud/shipment.types";
import { shipmentDisclosures } from "./shipment.effects";

/**
 * Serves both `markDelayed` and `markFailed`: the target switches the copy and
 * the follow-up it announces, everything else — the mandatory reason, the
 * exception the affected customers will see — is identical.
 */
export function ShipmentExceptionDialog({
	open,
	shipment,
	target,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	shipment?: ShipmentDetail;
	target: "delayed" | "failed";
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: { reason: string }) => void;
}) {
	const [reason, setReason] = useState("");

	useEffect(() => {
		if (open) setReason("");
	}, [open]);

	const isFailure = target === "failed";

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
						{isFailure ? "Marcar fallido" : "Marcar demorado"}
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={
				isFailure
					? `Marcar fallido ${shipment?.internalCode ?? "envío"}`
					: `Marcar demorado ${shipment?.internalCode ?? "envío"}`
			}
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="shipment-exception-reason">Motivo</FieldLabel>
					<Textarea
						id="shipment-exception-reason"
						onChange={(event) => setReason(event.target.value)}
						placeholder={
							isFailure
								? "Por qué el envío no va a llegar"
								: "Por qué el envío se demora"
						}
						rows={3}
						value={reason}
					/>
					<FieldDescription>
						Obligatorio. Queda en la auditoría y en el aviso que ve cada cliente
						afectado.
					</FieldDescription>
				</Field>
			</FieldGroup>

			<CrudEffectsPanel
				disclosure={resolveDisclosure(
					isFailure
						? shipmentDisclosures.markFailed
						: shipmentDisclosures.markDelayed,
					{ shipment },
				)}
			/>
		</CrudFormDialogShell>
	);
}
