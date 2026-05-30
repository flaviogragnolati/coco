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
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { destinationCreateInputSchema } from "~/schemas/admin/destination.schemas";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import type {
	DestinationDetail,
	DestinationFormInput,
	DestinationFormValues,
} from "~/shared/common/admin-crud/destination.types";
import {
	defaultDestinationFormValues,
	destinationDetailToFormValues,
} from "./destination.mappers";

export function DestinationFormDialog({
	open,
	mode,
	destination,
	isLoadingDestination,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	destination?: DestinationDetail;
	isLoadingDestination?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: DestinationFormValues) => void;
}) {
	const form = useForm<DestinationFormInput, unknown, DestinationFormValues>({
		resolver: zodResolver(destinationCreateInputSchema),
		defaultValues: defaultDestinationFormValues,
	});

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const title = mode === "create" ? "Agregar destino" : "Editar destino";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultDestinationFormValues);
			return;
		}

		if (destination) {
			form.reset(destinationDetailToFormValues(destination));
		}
	}, [destination, form, mode, open]);

	return (
		<CrudFormDialogShell
			description="El ID es informativo y se genera automaticamente."
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
						disabled={isSubmitting || (mode === "edit" && isLoadingDestination)}
						form="destination-crud-form"
						type="submit"
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
			{mode === "edit" && isLoadingDestination ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="destination-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[12rem_1fr]">
						<Field>
							<FieldLabel htmlFor="destination-id">ID</FieldLabel>
							<Input
								disabled
								id="destination-id"
								value={destination?.id ? String(destination.id) : "Automatico"}
							/>
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={active}
								disabled={isSubmitting || destination?.deleted}
								onCheckedChange={(checked) =>
									form.setValue("active", checked, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
							<FieldContent>
								<FieldLabel>Destino activo</FieldLabel>
								<FieldDescription>
									{destination?.deleted ? (
										<CrudStatusBadge
											active={destination.active}
											deleted={destination.deleted}
										/>
									) : (
										"Disponible para operaciones nuevas"
									)}
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>

					<FieldGroup>
						<Field data-invalid={Boolean(errors.name)}>
							<FieldLabel htmlFor="destination-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								disabled={isSubmitting}
								id="destination-name"
								{...form.register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field data-invalid={Boolean(errors.googleMapsUrl)}>
							<FieldLabel htmlFor="destination-google-maps-url">
								Google Maps URL
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.googleMapsUrl)}
								disabled={isSubmitting}
								id="destination-google-maps-url"
								placeholder="https://..."
								{...form.register("googleMapsUrl")}
							/>
							<FieldError errors={[errors.googleMapsUrl]} />
						</Field>
						<Field data-invalid={Boolean(errors.description)}>
							<FieldLabel htmlFor="destination-description">
								Descripcion
							</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.description)}
								disabled={isSubmitting}
								id="destination-description"
								{...form.register("description")}
							/>
							<FieldError errors={[errors.description]} />
						</Field>
					</FieldGroup>
				</form>
			)}
		</CrudFormDialogShell>
	);
}
