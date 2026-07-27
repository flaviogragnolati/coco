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
import type { OperationDetail } from "~/shared/common/admin-crud/operation.types";

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

	const liveLots =
		operation?.lots.filter((lot) => lot.status !== "cancelled") ?? [];
	const openRollOvers =
		operation?.rollOvers.filter((rollOver) => rollOver.status === "open") ?? [];

	return (
		<CrudFormDialogShell
			description="Se cancelan los lotes, sus líneas y las órdenes de proveedor de la operación. Nada se elimina: la demanda vuelve a la cola y se agrupa en la próxima operación."
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

			<section className="flex flex-col gap-1 rounded-2xl border p-3 text-xs">
				<h3 className="font-semibold text-muted-foreground uppercase tracking-wide">
					Qué se compensa
				</h3>
				<span>
					{liveLots.length} lote(s) activos y sus órdenes se cancelan.
				</span>
				<span>
					{openRollOvers.length} rollover(s) propios se cancelan; los que esta
					operación consumió vuelven a abrirse.
				</span>
			</section>
		</CrudFormDialogShell>
	);
}
