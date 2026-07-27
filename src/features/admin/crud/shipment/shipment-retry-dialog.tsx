"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "~/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { shipmentRetryInputSchema } from "~/schemas/admin/shipment.schemas";
import type {
	ShipmentDetail,
	ShipmentRetryInput,
} from "~/shared/common/admin-crud/shipment.types";

type RetryFormInput = {
	id: number;
	shipment: { name: string; internalCode: string; trackingCode?: string };
};

function defaultValues(shipment?: ShipmentDetail): RetryFormInput {
	return {
		id: shipment?.id ?? 0,
		shipment: {
			name: shipment ? `${shipment.name} (reintento)` : "",
			internalCode: "",
			trackingCode: undefined,
		},
	};
}

/**
 * A retry creates a **new** shipment and moves the surviving packages onto it,
 * ids intact. The failed shipment stays failed and emptied, as history.
 */
export function ShipmentRetryDialog({
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
	onSubmit: (values: ShipmentRetryInput) => void;
}) {
	const form = useForm<RetryFormInput, unknown, ShipmentRetryInput>({
		resolver: zodResolver(shipmentRetryInputSchema),
		defaultValues: defaultValues(shipment),
	});

	useEffect(() => {
		if (open) form.reset(defaultValues(shipment));
	}, [open, shipment, form]);

	const packages = shipment?.packages ?? [];

	return (
		<CrudFormDialogShell
			description="Los paquetes activos se mueven a un envío nuevo conservando su identidad. El envío fallido queda vacío como historia."
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
						form="shipment-retry-form"
						type="submit"
					>
						Reintentar
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Reintentar ${shipment?.internalCode ?? "envío"}`}
		>
			<form
				className="flex flex-col gap-3"
				id="shipment-retry-form"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="retry-shipment-name">
							Nombre del envío nuevo
						</FieldLabel>
						<Input
							autoComplete="off"
							id="retry-shipment-name"
							{...form.register("shipment.name")}
						/>
						<FieldError>
							{form.formState.errors.shipment?.name?.message}
						</FieldError>
					</Field>
					<Field>
						<FieldLabel htmlFor="retry-shipment-code">
							Código interno
						</FieldLabel>
						<Input
							autoComplete="off"
							id="retry-shipment-code"
							{...form.register("shipment.internalCode")}
						/>
						<FieldDescription>
							Único en el sistema; no puede repetir el del envío fallido.
						</FieldDescription>
						<FieldError>
							{form.formState.errors.shipment?.internalCode?.message}
						</FieldError>
					</Field>
					<Field>
						<FieldLabel htmlFor="retry-shipment-tracking">
							Tracking code
						</FieldLabel>
						<Input
							autoComplete="off"
							id="retry-shipment-tracking"
							{...form.register("shipment.trackingCode")}
						/>
						<FieldDescription>Opcional.</FieldDescription>
					</Field>
				</FieldGroup>

				<section className="flex flex-col gap-2 rounded-2xl border p-3">
					<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						Paquetes que se reasignan
					</h3>
					{packages.length === 0 ? (
						<p className="text-muted-foreground text-xs">Sin paquetes.</p>
					) : (
						packages.map((pkg) => (
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
			</form>
		</CrudFormDialogShell>
	);
}
