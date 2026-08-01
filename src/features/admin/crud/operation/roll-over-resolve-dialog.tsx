"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import {
	buildAnnouncedToast,
	resolveDisclosure,
} from "~/features/admin/crud/_lib/fulfillment-effects";
import { api } from "~/trpc/react";
import { rollOverDisclosures } from "./operation.effects";

/**
 * Owns its own mutation so the operation detail dialog stays presentational and
 * its props stay data-only.
 */
export function RollOverResolveDialog({
	open,
	rollOver,
	onOpenChange,
}: {
	open: boolean;
	rollOver?: { id: number; quantity: string; cartItemCode: string };
	onOpenChange: (open: boolean) => void;
}) {
	const [reason, setReason] = useState("");
	const utils = api.useUtils();

	useEffect(() => {
		if (open) setReason("");
	}, [open]);

	const resolveMutation = api.admin.rollOver.resolve.useMutation({
		onSuccess: async () => {
			const { title, description } = buildAnnouncedToast(
				"Rollover resuelto",
				rollOverDisclosures.resolve,
				{ rollOver },
			);
			toast.success(title, { description });
			onOpenChange(false);
			await Promise.all([
				utils.admin.operation.invalidate(),
				utils.admin.supplierOrder.invalidate(),
				// The dialog is reachable from the roll-overs list too, which shows the
				// status this command just changed.
				utils.admin.rollOver.invalidate(),
			]);
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo resolver el rollover");
		},
	});

	return (
		<CrudFormDialogShell
			footer={
				<>
					<Button
						disabled={resolveMutation.isPending}
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Volver
					</Button>
					<Button
						disabled={resolveMutation.isPending || reason.trim().length === 0}
						onClick={() => {
							if (!rollOver) return;
							resolveMutation.mutate({
								id: rollOver.id,
								reason: reason.trim(),
							});
						}}
						type="button"
					>
						Resolver
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={
				rollOver
					? `Resolver rollover de ${rollOver.cartItemCode}`
					: "Resolver rollover"
			}
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="roll-over-resolve-reason">Motivo</FieldLabel>
					<Textarea
						id="roll-over-resolve-reason"
						onChange={(event) => setReason(event.target.value)}
						placeholder="Cómo se resolvió la cantidad reprogramada"
						rows={3}
						value={reason}
					/>
					<FieldDescription>
						Obligatorio. Queda en la auditoría y en el tracking del item.
					</FieldDescription>
				</Field>
			</FieldGroup>

			<CrudEffectsPanel
				disclosure={resolveDisclosure(rollOverDisclosures.resolve, {
					rollOver,
				})}
			/>
		</CrudFormDialogShell>
	);
}
