"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { carrierOrderFieldsSchema } from "~/schemas/admin/carrier-order.schemas";
import type { CarrierListItem } from "~/shared/common/admin-crud/carrier.types";
import type {
	CarrierOrderDetail,
	CarrierOrderFormInput,
	CarrierOrderFormValues,
} from "~/shared/common/admin-crud/carrier-order.types";
import { CarrierOrderShipmentPicker } from "./carrier-order-shipment-picker";

function defaultValues(
	carrierOrder: CarrierOrderDetail | undefined,
	fallbackCarrierId: number,
): CarrierOrderFormInput {
	return {
		carrierId: carrierOrder?.carrier.id ?? fallbackCarrierId,
		code: carrierOrder?.code ?? "",
		externalReference: carrierOrder?.externalReference ?? "",
		metadata: carrierOrder?.metadata
			? JSON.stringify(carrierOrder.metadata, null, 2)
			: "",
	};
}

/**
 * Create and edit share one dialog. There is deliberately **no `status`
 * control**: the booking's status only ever moves through the guarded ladder
 * commands, so a free select here would be the first un-guarded status write in
 * fulfillment.
 */
export function CarrierOrderFormDialog({
	open,
	mode,
	carrierOrder,
	carriers,
	isLoadingCarriers,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: "create" | "edit";
	carrierOrder?: CarrierOrderDetail;
	carriers: CarrierListItem[];
	isLoadingCarriers?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (
		values: CarrierOrderFormValues & { shipmentIds: number[] },
	) => void;
}) {
	const isCreate = mode === "create";
	const selectableCarriers = carriers.filter((carrier) => !carrier.deleted);
	const fallbackCarrierId = selectableCarriers[0]?.id ?? 0;
	const [shipmentIds, setShipmentIds] = useState<number[]>([]);

	const form = useForm<CarrierOrderFormInput, unknown, CarrierOrderFormValues>({
		resolver: zodResolver(carrierOrderFieldsSchema),
		defaultValues: defaultValues(carrierOrder, fallbackCarrierId),
	});
	const errors = form.formState.errors;

	useEffect(() => {
		if (!open) return;
		form.reset(defaultValues(carrierOrder, fallbackCarrierId));
		setShipmentIds([]);
	}, [carrierOrder, fallbackCarrierId, form, open]);

	const toggleShipment = (shipmentId: number) => {
		setShipmentIds((current) =>
			current.includes(shipmentId)
				? current.filter((id) => id !== shipmentId)
				: [...current, shipmentId],
		);
	};

	return (
		<CrudFormDialogShell
			description={
				isCreate
					? "Transcribí la contratación del transporte. El estado arranca en pendiente y avanza con los comandos."
					: "Editá los datos de la contratación. El estado no se edita acá."
			}
			footer={
				<>
					<Button
						disabled={isSubmitting}
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cancelar
					</Button>
					<Button
						disabled={
							isSubmitting ||
							isLoadingCarriers ||
							selectableCarriers.length === 0
						}
						form="carrier-order-form"
						type="submit"
						variant="highlight"
					>
						{isCreate ? "Crear orden" : "Guardar cambios"}
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={
				isCreate
					? "Nueva orden de transporte"
					: `Editar ${carrierOrder?.code ?? "orden de transporte"}`
			}
		>
			<form
				className="flex flex-col gap-5"
				id="carrier-order-form"
				onSubmit={form.handleSubmit((values) =>
					onSubmit({ ...values, shipmentIds: isCreate ? shipmentIds : [] }),
				)}
			>
				<FieldGroup className="grid gap-4 md:grid-cols-2">
					<Field data-invalid={Boolean(errors.carrierId)}>
						<FieldLabel htmlFor="carrier-order-carrier">
							Transportista
						</FieldLabel>
						<Select
							aria-invalid={Boolean(errors.carrierId)}
							disabled={isSubmitting || isLoadingCarriers}
							id="carrier-order-carrier"
							onChange={(event) =>
								form.setValue("carrierId", Number(event.target.value), {
									shouldDirty: true,
									shouldValidate: true,
								})
							}
							value={String(form.watch("carrierId") || "")}
						>
							<option value="">Seleccionar</option>
							{selectableCarriers.map((carrier) => (
								<option key={carrier.id} value={carrier.id}>
									{carrier.name}
								</option>
							))}
						</Select>
						<FieldError errors={[errors.carrierId]} />
					</Field>
					<Field data-invalid={Boolean(errors.code)}>
						<FieldLabel htmlFor="carrier-order-code">Código</FieldLabel>
						<Input
							aria-invalid={Boolean(errors.code)}
							disabled={isSubmitting}
							id="carrier-order-code"
							{...form.register("code")}
						/>
						<FieldError errors={[errors.code]} />
					</Field>
				</FieldGroup>

				<Field data-invalid={Boolean(errors.externalReference)}>
					<FieldLabel htmlFor="carrier-order-external-reference">
						Referencia externa
					</FieldLabel>
					<Input
						aria-invalid={Boolean(errors.externalReference)}
						disabled={isSubmitting}
						id="carrier-order-external-reference"
						{...form.register("externalReference")}
					/>
					<FieldDescription>
						El número que usa el transportista. Opcional; suele llegar después.
					</FieldDescription>
					<FieldError errors={[errors.externalReference]} />
				</Field>

				<Field data-invalid={Boolean(errors.metadata)}>
					<FieldLabel htmlFor="carrier-order-metadata">Metadata</FieldLabel>
					<Textarea
						aria-invalid={Boolean(errors.metadata)}
						disabled={isSubmitting}
						id="carrier-order-metadata"
						placeholder='{"ruta": "AMBA"}'
						rows={4}
						{...form.register("metadata")}
					/>
					<FieldDescription>JSON libre. Opcional.</FieldDescription>
					<FieldError errors={[errors.metadata]} />
				</Field>

				{isCreate ? (
					<CarrierOrderShipmentPicker
						onToggle={toggleShipment}
						selectedIds={shipmentIds}
					/>
				) : null}
			</form>
		</CrudFormDialogShell>
	);
}
