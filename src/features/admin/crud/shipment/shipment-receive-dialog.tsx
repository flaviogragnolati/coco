"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type UseFormReturn, useForm, useWatch } from "react-hook-form";
import { Button } from "~/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import {
	fromScaled,
	toScaled,
} from "~/features/admin/crud/supplier-order/supplier-order-quantity";
import { shipmentReceiveInputSchema } from "~/schemas/admin/shipment.schemas";
import type {
	ShipmentDetail,
	ShipmentReceiveFormInput,
	ShipmentReceiveInput,
} from "~/shared/common/admin-crud/shipment.types";

type ShipmentPackage = ShipmentDetail["packages"][number];
type ShipmentPackageLine = ShipmentPackage["lines"][number];

type ReceiveFormInput = ShipmentReceiveFormInput;
type ReceiveFormValues = ShipmentReceiveInput;
type ReceiveForm = UseFormReturn<ReceiveFormInput, unknown, ReceiveFormValues>;

/**
 * Every live line of every live package, in the order the server expects to see
 * them: the payload has to cover all of them exactly once.
 */
function liveLines(shipment?: ShipmentDetail) {
	return (
		shipment?.packages
			.filter((pkg) => pkg.status !== "cancelled")
			.flatMap((pkg) =>
				pkg.lines
					.filter((line) => line.status !== "cancelled")
					.map((line) => ({ pkg, line })),
			) ?? []
	);
}

function defaultValues(shipment?: ShipmentDetail): ReceiveFormInput {
	return {
		id: shipment?.id ?? 0,
		// Defaulting every line to its full quantity makes "everything arrived" the
		// zero-input path; a reduction is what reveals the reason field.
		lines: liveLines(shipment).map(({ line }) => ({
			packageLotItemId: line.id,
			receivedQuantity: line.quantity,
			reason: undefined,
		})),
		final: false,
		finalReason: undefined,
	};
}

function LineRow({
	index,
	pkg,
	line,
	form,
}: {
	index: number;
	pkg: ShipmentPackage;
	line: ShipmentPackageLine;
	form: ReceiveForm;
}) {
	const receivedQuantity =
		useWatch({
			control: form.control,
			name: `lines.${index}.receivedQuantity`,
		}) ?? "";

	const declared = toScaled(line.quantity) ?? 0n;
	const received = toScaled(receivedQuantity);
	const shortfall = received === null ? null : declared - received;

	return (
		<div className="flex flex-col gap-2 rounded-lg border p-3">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div className="flex flex-col gap-1">
					<p className="font-medium text-sm">
						{line.lotItemCode} · {line.productName}
					</p>
					<p className="text-muted-foreground text-xs">
						{pkg.name} · despachado {line.quantity}
					</p>
				</div>
				<Field className="w-40">
					<FieldLabel htmlFor={`received-${line.id}`}>Recibido</FieldLabel>
					<Input
						autoComplete="off"
						id={`received-${line.id}`}
						inputMode="decimal"
						{...form.register(`lines.${index}.receivedQuantity`)}
					/>
					<FieldError>
						{form.formState.errors.lines?.[index]?.receivedQuantity?.message}
					</FieldError>
				</Field>
			</div>

			{shortfall !== null && shortfall > 0n ? (
				<div className="flex flex-col gap-2 rounded-md bg-muted/40 p-2">
					<p className="text-xs">
						Faltante de <strong>{fromScaled(shortfall)}</strong>
						{received === 0n
							? " — la línea se cancela y todo vuelve a rollover"
							: " — vuelve a rollover para la demanda que lo absorbe"}
					</p>
					<Field>
						<FieldLabel htmlFor={`reason-${line.id}`}>
							Motivo del faltante
						</FieldLabel>
						<Input
							autoComplete="off"
							id={`reason-${line.id}`}
							{...form.register(`lines.${index}.reason`)}
						/>
						<FieldDescription>
							Obligatorio cuando llega menos de lo despachado.
						</FieldDescription>
					</Field>
				</div>
			) : null}

			{shortfall !== null && shortfall < 0n ? (
				<p className="text-destructive text-xs">
					No se puede recibir más de lo despachado; registrá un segundo despacho
					para el excedente.
				</p>
			) : null}
		</div>
	);
}

export function ShipmentReceiveDialog({
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
	onSubmit: (values: ReceiveFormValues) => void;
}) {
	const form = useForm<ReceiveFormInput, unknown, ReceiveFormValues>({
		resolver: zodResolver(shipmentReceiveInputSchema),
		defaultValues: defaultValues(shipment),
	});
	const lines = liveLines(shipment);

	useEffect(() => {
		if (open) form.reset(defaultValues(shipment));
	}, [open, shipment, form]);

	const watchedLines = useWatch({ control: form.control, name: "lines" });
	const final = useWatch({ control: form.control, name: "final" }) ?? false;
	const finalReason = useWatch({ control: form.control, name: "finalReason" });

	const blocked = lines.some(({ line }, index) => {
		const declared = toScaled(line.quantity) ?? 0n;
		const entry = watchedLines?.[index];
		const received = toScaled(entry?.receivedQuantity ?? "");
		if (received === null || received > declared) return true;

		// The server enforces this too; blocking here saves a round trip.
		return received < declared && (entry?.reason ?? "").trim().length === 0;
	});
	const finalBlocked = final && (finalReason ?? "").trim().length === 0;

	return (
		<CrudFormDialogShell
			description="Cada línea se recibe por su cantidad. Lo que falta se convierte en rollover para la demanda que lo absorbe."
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
							isSubmitting || blocked || finalBlocked || lines.length === 0
						}
						form="shipment-receive-form"
						type="submit"
					>
						Recibir
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Recibir ${shipment?.internalCode ?? "envío"}`}
		>
			<form
				className="flex flex-col gap-3"
				id="shipment-receive-form"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				{lines.length === 0 ? (
					<p className="text-muted-foreground text-xs">
						El envío no tiene líneas activas.
					</p>
				) : (
					lines.map(({ pkg, line }, index) => (
						<LineRow
							form={form}
							index={index}
							key={line.id}
							line={line}
							pkg={pkg}
						/>
					))
				)}

				<FieldGroup>
					<Field orientation="horizontal">
						<Switch
							checked={final}
							disabled={isSubmitting}
							id="receive-final"
							onCheckedChange={(checked) =>
								form.setValue("final", checked, { shouldDirty: true })
							}
						/>
						<FieldContent>
							<FieldLabel htmlFor="receive-final">
								Cierre definitivo de la orden
							</FieldLabel>
							<FieldDescription>
								Marca esta entrega como la última: lo que quede sin despachar
								vuelve a rollover y la orden de proveedor se completa.
							</FieldDescription>
						</FieldContent>
					</Field>
					{final ? (
						<Field>
							<FieldLabel htmlFor="receive-final-reason">
								Motivo del cierre
							</FieldLabel>
							<Textarea
								id="receive-final-reason"
								rows={2}
								{...form.register("finalReason")}
							/>
							<FieldDescription>
								Obligatorio si queda cantidad sin despachar.
							</FieldDescription>
						</Field>
					) : null}
				</FieldGroup>
			</form>
		</CrudFormDialogShell>
	);
}
