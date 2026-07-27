"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import type { PackageDetail } from "~/shared/common/admin-crud/package.types";

/**
 * Promotion is a confirmation, not a form: the whole package moves to the
 * outbound leg as it stands. The only editable field is the name, because the
 * inbound name usually reads as a supplier dispatch.
 */
export function PackagePromoteDialog({
	open,
	pkg,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	pkg?: PackageDetail;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: { name?: string }) => void;
}) {
	const [name, setName] = useState("");

	useEffect(() => {
		if (open) setName(pkg?.name ?? "");
	}, [open, pkg]);

	const liveLines =
		pkg?.packageLines.filter((line) => line.status !== "cancelled") ?? [];
	const customer = liveLines.flatMap((line) => line.packageAllocations).at(0)
		?.demandAllocation.cartItem.cart;

	return (
		<CrudFormDialogShell
			description="El paquete pasa a la pata de salida y vuelve a estado listo para envío: su “recibido” registraba la llegada de entrada, no la entrega al cliente."
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
						onClick={() =>
							onSubmit({
								name:
									name.trim().length > 0 && name.trim() !== pkg?.name
										? name.trim()
										: undefined,
							})
						}
						type="button"
					>
						Promover a salida
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Promover ${pkg?.name ?? "paquete"}`}
		>
			<Field>
				<FieldLabel htmlFor="package-promote-name">Nombre</FieldLabel>
				<Input
					autoComplete="off"
					id="package-promote-name"
					onChange={(event) => setName(event.target.value)}
					value={name}
				/>
				<FieldDescription>
					Opcional. Sin cambios se conserva el nombre actual.
				</FieldDescription>
			</Field>

			<section className="flex flex-col gap-2 rounded-2xl border p-3">
				<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Cliente
				</h3>
				<p className="text-xs">
					{customer
						? `${customer.code} — ${customer.user.name}`
						: "Sin asignaciones activas"}
				</p>
				<h3 className="mt-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Contenido
				</h3>
				{liveLines.map((line) => (
					<span className="text-muted-foreground text-xs" key={line.id}>
						{line.lotItem.code} · {line.lotItem.product.name} — {line.quantity}{" "}
						{line.lotItem.product.unit}
					</span>
				))}
			</section>
		</CrudFormDialogShell>
	);
}
