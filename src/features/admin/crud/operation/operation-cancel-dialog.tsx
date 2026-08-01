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
import type { OperationDetail } from "~/shared/common/admin-crud/operation.types";
import { operationDisclosures } from "./operation.effects";

export function OperationCancelDialog({
	open,
	operation,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	operation?: OperationDetail;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: { reason: string }) => void;
}) {
	const [reason, setReason] = useState("");

	useEffect(() => {
		if (open) setReason("");
	}, [open]);

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
						Cancelar operación
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Cancelar ${operation?.code ?? "operación"}`}
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="operation-cancel-reason">Motivo</FieldLabel>
					<Textarea
						id="operation-cancel-reason"
						onChange={(event) => setReason(event.target.value)}
						placeholder="Por qué se compensa la operación"
						rows={3}
						value={reason}
					/>
					<FieldDescription>
						Obligatorio. Queda en la auditoría y en el tracking de cada item
						excluido.
					</FieldDescription>
				</Field>
			</FieldGroup>

			<CrudEffectsPanel
				disclosure={resolveDisclosure(operationDisclosures.cancel, {
					operation,
				})}
			/>
		</CrudFormDialogShell>
	);
}
