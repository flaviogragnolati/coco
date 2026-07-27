"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import {
	type UseFormReturn,
	useFieldArray,
	useForm,
	useWatch,
} from "react-hook-form";
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
import { supplierOrderConfirmInputSchema } from "~/schemas/admin/supplier-order.schemas";
import type {
	SupplierOrderConfirmFormInput,
	SupplierOrderConfirmInput,
	SupplierOrderDetail,
} from "~/shared/common/admin-crud/supplier-order.types";
import {
	fromScaled,
	previewLifoAbsorption,
	sumScaled,
	toScaled,
} from "./supplier-order-quantity";

type SupplierOrderLotItem =
	SupplierOrderDetail["lots"][number]["lotItems"][number];

type ConfirmFormInput = SupplierOrderConfirmFormInput;
type ConfirmFormValues = SupplierOrderConfirmInput;
type ConfirmForm = UseFormReturn<ConfirmFormInput, unknown, ConfirmFormValues>;

function liveLotItems(supplierOrder?: SupplierOrderDetail) {
	return (
		supplierOrder?.lots.flatMap((lot) =>
			lot.lotItems.filter((lotItem) => lotItem.status !== "cancelled"),
		) ?? []
	);
}

function defaultValues(supplierOrder?: SupplierOrderDetail): ConfirmFormInput {
	return {
		id: supplierOrder?.id ?? 0,
		externalReference: supplierOrder?.externalReference ?? undefined,
		// Defaulting every line to its full quantity makes "confirm everything"
		// the zero-input path.
		lines: liveLotItems(supplierOrder).map((lotItem) => ({
			lotItemId: lotItem.id,
			confirmedQuantity: lotItem.quantity,
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
	form: ConfirmForm;
}) {
	const overridesField = useFieldArray({
		control: form.control,
		name: `lines.${index}.overrides`,
	});

	const confirmedQuantity =
		useWatch({
			control: form.control,
			name: `lines.${index}.confirmedQuantity`,
		}) ?? "";
	const overrides = useWatch({
		control: form.control,
		name: `lines.${index}.overrides`,
	});

	const requested = toScaled(lotItem.quantity) ?? 0n;
	const confirmed = toScaled(confirmedQuantity);
	const cut = confirmed === null ? null : requested - confirmed;
	const overridesEnabled = overrides !== undefined;

	const preview = useMemo(() => {
		if (cut === null || cut <= 0n) return [];
		return previewLifoAbsorption(
			lotItem.demandAllocations.map((allocation) => ({
				id: allocation.id,
				quantity: allocation.quantity,
			})),
			cut,
		);
	}, [cut, lotItem.demandAllocations]);

	const overrideTotal = sumScaled(
		(overrides ?? []).map(
			(override) => toScaled(override.removedQuantity) ?? 0n,
		),
	);
	const overrideMismatch =
		overridesEnabled && cut !== null && overrideTotal !== cut;

	function toggleOverrides() {
		if (overridesEnabled) {
			form.setValue(`lines.${index}.overrides`, undefined);
			return;
		}

		form.setValue(
			`lines.${index}.overrides`,
			// Seed the manual split from the LIFO preview so an operator adjusts a
			// concrete plan rather than starting from an empty grid.
			lotItem.demandAllocations.map((allocation) => ({
				allocationId: allocation.id,
				removedQuantity:
					preview.find((entry) => entry.allocationId === allocation.id)
						?.removedQuantity ?? "0",
			})),
		);
	}

	const allocationById = new Map(
		lotItem.demandAllocations.map((allocation) => [allocation.id, allocation]),
	);

	return (
		<div className="flex flex-col gap-2 rounded-lg border p-3">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div className="flex flex-col gap-1">
					<p className="font-medium text-sm">
						{lotItem.code} · {lotItem.product.name}
					</p>
					<p className="text-muted-foreground text-xs">
						Solicitado {lotItem.quantity} {lotItem.product.unit}
					</p>
				</div>
				<Field className="w-40">
					<FieldLabel htmlFor={`confirmed-${lotItem.id}`}>
						Confirmado
					</FieldLabel>
					<Input
						autoComplete="off"
						id={`confirmed-${lotItem.id}`}
						inputMode="decimal"
						{...form.register(`lines.${index}.confirmedQuantity`)}
					/>
					<FieldError>
						{form.formState.errors.lines?.[index]?.confirmedQuantity?.message}
					</FieldError>
				</Field>
			</div>

			{cut !== null && cut > 0n ? (
				<div className="flex flex-col gap-2 rounded-md bg-muted/40 p-2">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="text-xs">
							Recorte de <strong>{fromScaled(cut)}</strong>{" "}
							{lotItem.product.unit}
							{confirmed === 0n ? " — la línea se cancela por completo" : null}
						</p>
						{confirmed !== 0n ? (
							<Button
								onClick={toggleOverrides}
								size="sm"
								type="button"
								variant="outline"
							>
								{overridesEnabled ? "Usar reparto LIFO" : "Ajustar reparto"}
							</Button>
						) : null}
					</div>

					{overridesEnabled ? (
						<div className="flex flex-col gap-2">
							{overridesField.fields.map((field, overrideIndex) => {
								const allocation = allocationById.get(
									(overrides ?? [])[overrideIndex]?.allocationId ?? -1,
								);

								return (
									<div
										className="grid items-center gap-2 text-xs md:grid-cols-[1fr_8rem]"
										key={field.id}
									>
										<span>
											{allocation
												? `#${allocation.absorptionOrder + 1} ${allocation.cartItem.cart.code} / ${allocation.cartItem.code} — asignado ${allocation.quantity}`
												: "Asignación desconocida"}
										</span>
										<Input
											autoComplete="off"
											inputMode="decimal"
											{...form.register(
												`lines.${index}.overrides.${overrideIndex}.removedQuantity`,
											)}
										/>
									</div>
								);
							})}
							{overrideMismatch ? (
								<p className="text-destructive text-xs">
									El reparto suma {fromScaled(overrideTotal)} y el recorte es{" "}
									{fromScaled(cut)}.
								</p>
							) : null}
						</div>
					) : (
						<div className="flex flex-col gap-1">
							{preview.map((entry) => {
								const allocation = allocationById.get(entry.allocationId);
								return (
									<p
										className="text-muted-foreground text-xs"
										key={entry.allocationId}
									>
										{allocation
											? `#${allocation.absorptionOrder + 1} ${allocation.cartItem.cart.code} / ${allocation.cartItem.code}`
											: `Asignación ${entry.allocationId}`}{" "}
										absorbe {entry.removedQuantity} (queda{" "}
										{entry.remainingQuantity})
									</p>
								);
							})}
						</div>
					)}
				</div>
			) : null}

			{cut !== null && cut < 0n ? (
				<p className="text-destructive text-xs">
					No se puede confirmar más de lo solicitado.
				</p>
			) : null}
		</div>
	);
}

export function SupplierOrderConfirmDialog({
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
	onSubmit: (values: ConfirmFormValues) => void;
}) {
	const form = useForm<ConfirmFormInput, unknown, ConfirmFormValues>({
		resolver: zodResolver(supplierOrderConfirmInputSchema),
		defaultValues: defaultValues(supplierOrder),
	});
	const lines = liveLotItems(supplierOrder);

	useEffect(() => {
		if (open) form.reset(defaultValues(supplierOrder));
	}, [open, supplierOrder, form]);

	const watchedLines = useWatch({ control: form.control, name: "lines" });

	const blocked = lines.some((lotItem, index) => {
		const line = watchedLines?.[index];
		if (!line) return true;

		const requested = toScaled(lotItem.quantity) ?? 0n;
		const confirmed = toScaled(line.confirmedQuantity ?? "");
		if (confirmed === null || confirmed > requested) return true;

		if (line.overrides === undefined) return false;
		return (
			sumScaled(
				line.overrides.map(
					(override) => toScaled(override.removedQuantity) ?? 0n,
				),
			) !==
			requested - confirmed
		);
	});

	return (
		<CrudFormDialogShell
			description="Cada línea se confirma por su cantidad. Lo que el proveedor no confirma se convierte en rollover para la demanda que lo absorbe."
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
						form="supplier-order-confirm-form"
						type="submit"
					>
						Confirmar
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={
				supplierOrder
					? `Confirmar ${supplierOrder.code}`
					: "Confirmar orden de proveedor"
			}
		>
			<form
				className="flex flex-col gap-3"
				id="supplier-order-confirm-form"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="confirm-external-reference">
							Referencia externa
						</FieldLabel>
						<Input
							autoComplete="off"
							id="confirm-external-reference"
							{...form.register("externalReference")}
						/>
						<FieldDescription>
							Opcional. Reemplaza la referencia registrada al solicitar.
						</FieldDescription>
					</Field>
				</FieldGroup>

				{lines.length === 0 ? (
					<p className="text-muted-foreground text-xs">
						La orden no tiene líneas activas.
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
