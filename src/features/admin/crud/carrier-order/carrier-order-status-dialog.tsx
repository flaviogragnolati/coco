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
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import type {
	CarrierOrderCommandKey,
	CarrierOrderDetail,
} from "~/shared/common/admin-crud/carrier-order.types";
import {
	carrierOrderActionLabelMap,
	carrierOrderReasonCommandKeys,
} from "./carrier-order.mappers";

type LadderCommandKey =
	| "request"
	| "confirm"
	| "markInTransit"
	| "complete"
	| "cancel"
	| "markFailed";

const descriptions: Record<LadderCommandKey, string> = {
	request: "La orden queda solicitada al transportista.",
	confirm: "El transportista confirmó la orden.",
	markInTransit:
		"La orden sale a la calle. Necesita al menos un envío activo asociado.",
	complete: "El transporte terminó su recorrido.",
	cancel:
		"La orden se cancela antes de salir. Los envíos asociados no cambian de estado.",
	markFailed:
		"El transporte no llegó a destino. Los envíos asociados no cambian de estado.",
};

export function isCarrierOrderLadderCommand(
	key: CarrierOrderCommandKey | "create",
): key is LadderCommandKey {
	return (
		key === "request" ||
		key === "confirm" ||
		key === "markInTransit" ||
		key === "complete" ||
		key === "cancel" ||
		key === "markFailed"
	);
}

/**
 * One dialog for the six ladder rungs. `cancel` and `markFailed` carry a
 * mandatory reason into the audit log; the other four are a plain confirm.
 */
export function CarrierOrderStatusDialog({
	open,
	command,
	carrierOrder,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	command: LadderCommandKey | null;
	carrierOrder?: CarrierOrderDetail;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: { reason?: string }) => void;
}) {
	const [reason, setReason] = useState("");

	useEffect(() => {
		if (open) setReason("");
	}, [open]);

	if (!command) return null;

	const needsReason = (
		carrierOrderReasonCommandKeys as readonly CarrierOrderCommandKey[]
	).includes(command);
	const destructive = needsReason;

	return (
		<CrudFormDialogShell
			description={descriptions[command]}
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
						disabled={
							isSubmitting || (needsReason && reason.trim().length === 0)
						}
						onClick={() =>
							onSubmit(needsReason ? { reason: reason.trim() } : {})
						}
						type="button"
						variant={destructive ? "destructive" : "highlight"}
					>
						{carrierOrderActionLabelMap[command]}
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`${carrierOrderActionLabelMap[command]} ${carrierOrder?.code ?? "orden de transporte"}`}
		>
			{needsReason ? (
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="carrier-order-status-reason">
							Motivo
						</FieldLabel>
						<Textarea
							id="carrier-order-status-reason"
							onChange={(event) => setReason(event.target.value)}
							placeholder="Por qué la orden no sigue adelante"
							rows={3}
							value={reason}
						/>
						<FieldDescription>
							Obligatorio. Queda en la auditoría de la orden.
						</FieldDescription>
					</Field>
				</FieldGroup>
			) : null}
		</CrudFormDialogShell>
	);
}
