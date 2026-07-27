"use client";

import { Button } from "~/components/ui/button";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import type { OperationDetail } from "~/shared/common/admin-crud/operation.types";

/**
 * Hard delete, and only for a failed operation with no lots and no roll overs —
 * `Operation` has no soft-delete column, so there is nothing to hide behind.
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
	return (
		<CrudFormDialogShell
			description="La operación se elimina definitivamente. Solo es posible sobre una operación fallida que no dejó lotes ni rollovers."
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
						Eliminar
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Eliminar ${operation?.code ?? "operación"}`}
		>
			{operation?.failureReason ? (
				<p className="text-muted-foreground text-xs">
					Motivo de la falla: {operation.failureReason}
				</p>
			) : null}
		</CrudFormDialogShell>
	);
}
