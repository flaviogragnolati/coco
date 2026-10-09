"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

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
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { pickupPointCreateInputSchema } from "~/schemas/admin/pickup-point.schemas";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import type {
	PickupPointDetail,
	PickupPointFormInput,
	PickupPointFormValues,
} from "~/shared/common/admin-crud/pickup-point.types";
import {
	defaultPickupPointFormValues,
	pickupPointDetailToFormValues,
} from "./pickup-point.mappers";

type TextFieldName = Exclude<keyof PickupPointFormValues, "active">;

const FORM_ID = "pickup-point-crud-form";

export function PickupPointFormDialog({
	open,
	mode,
	pickupPoint,
	isLoadingPickupPoint,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	pickupPoint?: PickupPointDetail;
	isLoadingPickupPoint?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: PickupPointFormValues) => void;
}) {
	const form = useForm<PickupPointFormInput, unknown, PickupPointFormValues>({
		resolver: zodResolver(pickupPointCreateInputSchema),
		defaultValues: defaultPickupPointFormValues,
	});

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const title =
		mode === "create" ? "Agregar punto de retiro" : "Editar punto de retiro";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultPickupPointFormValues);
			return;
		}

		if (pickupPoint) {
			form.reset(pickupPointDetailToFormValues(pickupPoint));
		}
	}, [pickupPoint, form, mode, open]);

	const textField = (
		name: TextFieldName,
		label: string,
		options: { placeholder?: string; description?: string } = {},
	) => (
		<Field data-invalid={Boolean(errors[name])}>
			<FieldLabel htmlFor={`pickup-point-${name}`}>{label}</FieldLabel>
			<Input
				aria-invalid={Boolean(errors[name])}
				disabled={isSubmitting}
				id={`pickup-point-${name}`}
				placeholder={options.placeholder}
				{...form.register(name)}
			/>
			{options.description ? (
				<FieldDescription>{options.description}</FieldDescription>
			) : null}
			<FieldError errors={[errors[name]]} />
		</Field>
	);

	return (
		<CrudFormDialogShell
			description="Los clientes lo eligen en el checkout y lo ven en Mis pedidos, así que escribilo como lo van a leer."
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
						disabled={isSubmitting || (mode === "edit" && isLoadingPickupPoint)}
						form={FORM_ID}
						type="submit"
						variant="highlight"
					>
						<SaveIcon data-icon="inline-start" />
						Guardar
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={title}
		>
			{mode === "edit" && isLoadingPickupPoint ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id={FORM_ID}
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<Field orientation="horizontal">
						<Switch
							checked={active}
							disabled={isSubmitting || mode === "edit"}
							onCheckedChange={(checked) =>
								form.setValue("active", checked, {
									shouldDirty: true,
									shouldValidate: true,
								})
							}
						/>
						<FieldContent>
							<FieldLabel>Punto activo</FieldLabel>
							<FieldDescription>
								{mode === "edit"
									? "Activalo o desactivalo desde la tabla: ahí ves cuántos pedidos lo eligieron."
									: "El checkout ofrece solo los puntos activos."}
							</FieldDescription>
						</FieldContent>
					</Field>

					<FieldGroup>
						{textField("name", "Nombre", { placeholder: "Centro" })}
						<div className="grid gap-4 md:grid-cols-2">
							{textField("line1", "Dirección")}
							{textField("line2", "Piso, local o referencia")}
							{textField("city", "Ciudad")}
							{textField("state", "Provincia")}
							{textField("postalCode", "Código postal")}
							{textField("country", "País")}
						</div>
						{textField("googleMapsUrl", "Google Maps URL", {
							placeholder: "https://...",
						})}
						<Field data-invalid={Boolean(errors.hours)}>
							<FieldLabel htmlFor="pickup-point-hours">Horarios</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.hours)}
								disabled={isSubmitting}
								id="pickup-point-hours"
								placeholder="Lun a vie 10 a 18 h"
								rows={2}
								{...form.register("hours")}
							/>
							<FieldError errors={[errors.hours]} />
						</Field>
						<Field data-invalid={Boolean(errors.instructions)}>
							<FieldLabel htmlFor="pickup-point-instructions">
								Instrucciones
							</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.instructions)}
								disabled={isSubmitting}
								id="pickup-point-instructions"
								placeholder="Tocá timbre y mostrá el número de pedido."
								rows={3}
								{...form.register("instructions")}
							/>
							<FieldError errors={[errors.instructions]} />
						</Field>
					</FieldGroup>
				</form>
			)}
		</CrudFormDialogShell>
	);
}
