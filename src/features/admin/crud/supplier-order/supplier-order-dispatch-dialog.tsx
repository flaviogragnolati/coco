"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type UseFormReturn, useForm, useWatch } from "react-hook-form";
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
import { supplierOrderRegisterDispatchInputSchema } from "~/schemas/admin/supplier-order.schemas";
import type {
	SupplierOrderDetail,
	SupplierOrderRegisterDispatchFormInput,
	SupplierOrderRegisterDispatchInput,
} from "~/shared/common/admin-crud/supplier-order.types";
import { sumScaled, toScaled } from "./supplier-order-quantity";

type SupplierOrderLotItem =
	SupplierOrderDetail["lots"][number]["lotItems"][number];

type DispatchFormInput = SupplierOrderRegisterDispatchFormInput;
type DispatchFormValues = SupplierOrderRegisterDispatchInput;
type DispatchForm = UseFormReturn<
	DispatchFormInput,
	unknown,
	DispatchFormValues
>;

/** Only lines with something left to dispatch: a covered line has nothing to offer. */
function dispatchableLotItems(supplierOrder?: SupplierOrderDetail) {
	return (
		supplierOrder?.lots.flatMap((lot) =>
			lot.lotItems.filter(
				(lotItem) =>
					lotItem.status !== "cancelled" &&
					(toScaled(lotItem.remainingQuantity) ?? 0n) > 0n,
			),
		) ?? []
	);
}

function defaultValues(supplierOrder?: SupplierOrderDetail): DispatchFormInput {
	const lines = dispatchableLotItems(supplierOrder);

	return {
		id: supplierOrder?.id ?? 0,
		shipment: {
			name: supplierOrder ? `Traslado ${supplierOrder.code}` : "",
			internalCode: "",
			trackingCode: undefined,
		},
		packageName: supplierOrder ? `Paquete ${supplierOrder.code}` : "",
		// Defaulting every line to its remainder makes "dispatch everything
		// outstanding" the zero-input path.
		lines: lines.map((lotItem) => ({
			lotItemId: lotItem.id,
			quantity: lotItem.remainingQuantity,
		})),
	};
}

function LineRow({
	index,
	lotItem,
	form,
}: {
	index: number;
	lotItem: SupplierOrderLotItem;
	form: DispatchForm;
}) {
	const quantity =
		useWatch({ control: form.control, name: `lines.${index}.quantity` }) ?? "";

	const remaining = toScaled(lotItem.remainingQuantity) ?? 0n;
	const requested = toScaled(quantity);
	const excessive = requested !== null && requested > remaining;

	return (
		<div className="flex flex-wrap items-end justify-between gap-2 rounded-lg border p-3">
			<div className="flex flex-col gap-1">
				<p className="font-medium text-sm">
					{lotItem.code} · {lotItem.product.name}
				</p>
				<p className="text-muted-foreground text-xs">
					Confirmado {lotItem.quantity} · despachado{" "}
					{lotItem.dispatchedQuantity} · pendiente {lotItem.remainingQuantity}{" "}
					{lotItem.product.unit}
				</p>
				<p className="text-muted-foreground text-xs">
					Destino {lotItem.destination.name}
				</p>
			</div>
			<Field className="w-40">
				<FieldLabel htmlFor={`dispatch-${lotItem.id}`}>A despachar</FieldLabel>
				<Input
					autoComplete="off"
					id={`dispatch-${lotItem.id}`}
					inputMode="decimal"
					{...form.register(`lines.${index}.quantity`)}
				/>
				<FieldError>
					{form.formState.errors.lines?.[index]?.quantity?.message}
				</FieldError>
				{excessive ? (
					<p className="text-destructive text-xs">
						Supera lo pendiente de despacho.
					</p>
				) : null}
			</Field>
		</div>
	);
}

export function SupplierOrderDispatchDialog({
	open,
	supplierOrder,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	supplierOrder?: SupplierOrderDetail;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: DispatchFormValues) => void;
}) {
	const form = useForm<DispatchFormInput, unknown, DispatchFormValues>({
		resolver: zodResolver(supplierOrderRegisterDispatchInputSchema),
		defaultValues: defaultValues(supplierOrder),
	});
	const lines = dispatchableLotItems(supplierOrder);

	useEffect(() => {
		if (open) form.reset(defaultValues(supplierOrder));
	}, [open, supplierOrder, form]);

	const watchedLines = useWatch({ control: form.control, name: "lines" });

	const total = sumScaled(
		(watchedLines ?? []).map((line) => toScaled(line?.quantity ?? "") ?? 0n),
	);
	const blocked =
		total <= 0n ||
		lines.some((lotItem, index) => {
			const declared = toScaled(watchedLines?.[index]?.quantity ?? "");
			if (declared === null) return true;
			return declared > (toScaled(lotItem.remainingQuantity) ?? 0n);
		});

	return (
		<CrudFormDialogShell
			description="Registrar el despacho crea el envío interno y el paquete de entrada consolidado. Un segundo paso confirma la salida."
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
						disabled={isSubmitting || blocked || lines.length === 0}
						form="supplier-order-dispatch-form"
						type="submit"
					>
						Registrar despacho
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={
				supplierOrder
					? `Despachar ${supplierOrder.code}`
					: "Registrar despacho de proveedor"
			}
		>
			<form
				className="flex flex-col gap-3"
				id="supplier-order-dispatch-form"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="dispatch-shipment-name">
							Nombre del envío
						</FieldLabel>
						<Input
							autoComplete="off"
							id="dispatch-shipment-name"
							{...form.register("shipment.name")}
						/>
						<FieldError>
							{form.formState.errors.shipment?.name?.message}
						</FieldError>
					</Field>
					<Field>
						<FieldLabel htmlFor="dispatch-shipment-code">
							Código interno
						</FieldLabel>
						<Input
							autoComplete="off"
							id="dispatch-shipment-code"
							{...form.register("shipment.internalCode")}
						/>
						<FieldDescription>
							Único en el sistema. Si ya existe, el despacho se rechaza.
						</FieldDescription>
						<FieldError>
							{form.formState.errors.shipment?.internalCode?.message}
						</FieldError>
					</Field>
					<Field>
						<FieldLabel htmlFor="dispatch-shipment-tracking">
							Tracking code
						</FieldLabel>
						<Input
							autoComplete="off"
							id="dispatch-shipment-tracking"
							{...form.register("shipment.trackingCode")}
						/>
						<FieldDescription>Opcional.</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor="dispatch-package-name">
							Nombre del paquete
						</FieldLabel>
						<Input
							autoComplete="off"
							id="dispatch-package-name"
							{...form.register("packageName")}
						/>
						<FieldError>
							{form.formState.errors.packageName?.message}
						</FieldError>
					</Field>
				</FieldGroup>

				{lines.length === 0 ? (
					<p className="text-muted-foreground text-xs">
						La orden no tiene cantidad pendiente de despacho.
					</p>
				) : (
					lines.map((lotItem, index) => (
						<LineRow
							form={form}
							index={index}
							key={lotItem.id}
							lotItem={lotItem}
						/>
					))
				)}
			</form>
		</CrudFormDialogShell>
	);
}
