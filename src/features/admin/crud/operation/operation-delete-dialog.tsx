"use client";

import { Button } from "~/components/ui/button";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import type { OperationDetail } from "~/shared/common/admin-crud/operation.types";

/**
 * Hard delete — `Operation` has no soft-delete column, so there is nothing to
 * hide behind. It serves two acts that are the same write: deleting a failed
 * operation, and discarding a draft. Neither owns lots or roll overs.
 */
export function OperationDeleteDialog({
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
	onSubmit: () => void;
}) {
	const isDraft = operation?.status === "draft";

	return (
		<CrudFormDialogShell
			description={
				isDraft
					? "El borrador se descarta definitivamente. La demanda que agrupaba queda intacta y entra en la próxima operación."
					: "La operación se elimina definitivamente. Solo es posible sobre una operación fallida que no dejó lotes ni rollovers."
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
						disabled={isSubmitting}
						onClick={onSubmit}
						type="button"
						variant="destructive"
					>
						{isDraft ? "Descartar" : "Eliminar"}
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`${isDraft ? "Descartar" : "Eliminar"} ${operation?.code ?? "operación"}`}
		>
			{operation?.failureReason ? (
				<p className="text-muted-foreground text-xs">
					Motivo de la falla: {operation.failureReason}
				</p>
			) : null}
		</CrudFormDialogShell>
	);
}
