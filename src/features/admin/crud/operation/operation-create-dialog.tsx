"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlayIcon } from "lucide-react";
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
import { Select } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { operationCreateInputSchema } from "~/schemas/admin/operation.schemas";
import type { DestinationListItem } from "~/shared/common/admin-crud/destination.types";
import type {
	OperationCreateFormInput,
	OperationCreateFormValues,
} from "~/shared/common/admin-crud/operation.types";
import { defaultOperationCreateFormValues } from "./operation.mappers";

export function OperationCreateDialog({
	open,
	destinations,
	isLoadingDestinations,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	destinations: DestinationListItem[];
	isLoadingDestinations?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: OperationCreateFormValues) => void;
}) {
	const activeDestinations = destinations.filter(
		(destination) => destination.active && !destination.deleted,
	);
	const defaultDestinationId = activeDestinations[0]?.id ?? 0;
	const form = useForm<
		OperationCreateFormInput,
		unknown,
		OperationCreateFormValues
	>({
		resolver: zodResolver(operationCreateInputSchema),
		defaultValues: defaultOperationCreateFormValues(defaultDestinationId),
	});
	const errors = form.formState.errors;
	const includeRollOver = Boolean(form.watch("includeRollOver"));

	useEffect(() => {
		if (!open) return;
		form.reset(defaultOperationCreateFormValues(defaultDestinationId));
	}, [defaultDestinationId, form, open]);

	return (
		<CrudFormDialogShell
			description="La operacion se crea y ejecuta al confirmar."
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
							isLoadingDestinations ||
							activeDestinations.length === 0
						}
						form="operation-create-form"
						type="submit"
					>
						<PlayIcon data-icon="inline-start" />
						Ejecutar
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title="Nueva operacion"
		>
			<form
				className="flex flex-col gap-5"
				id="operation-create-form"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				<FieldGroup className="grid gap-4 md:grid-cols-2">
					<Field data-invalid={Boolean(errors.from)}>
						<FieldLabel htmlFor="operation-from">Desde</FieldLabel>
						<Input
							aria-invalid={Boolean(errors.from)}
							disabled={isSubmitting}
							id="operation-from"
							type="datetime-local"
							{...form.register("from")}
						/>
						<FieldError errors={[errors.from]} />
					</Field>
					<Field data-invalid={Boolean(errors.to)}>
						<FieldLabel htmlFor="operation-to">Hasta</FieldLabel>
						<Input
							aria-invalid={Boolean(errors.to)}
							disabled={isSubmitting}
							id="operation-to"
							type="datetime-local"
							{...form.register("to")}
						/>
						<FieldError errors={[errors.to]} />
					</Field>
				</FieldGroup>

				<FieldGroup className="grid gap-4 md:grid-cols-[1fr_12rem]">
					<Field data-invalid={Boolean(errors.destinationId)}>
						<FieldLabel htmlFor="operation-destination">Destino</FieldLabel>
						<Select
							aria-invalid={Boolean(errors.destinationId)}
							disabled={isSubmitting || isLoadingDestinations}
							id="operation-destination"
							onChange={(event) =>
								form.setValue("destinationId", Number(event.target.value), {
									shouldDirty: true,
									shouldValidate: true,
								})
							}
							value={String(form.watch("destinationId") || "")}
						>
							<option value="">Seleccionar</option>
							{activeDestinations.map((destination) => (
								<option key={destination.id} value={destination.id}>
									{destination.name}
								</option>
							))}
						</Select>
						<FieldError errors={[errors.destinationId]} />
					</Field>
					<Field>
						<FieldLabel htmlFor="operation-strategy">Estrategia</FieldLabel>
						<Select
							disabled
							id="operation-strategy"
							value={form.watch("strategy")}
						>
							<option value="fifo">FIFO</option>
						</Select>
					</Field>
				</FieldGroup>

				<Field orientation="horizontal">
					<Switch
						checked={includeRollOver}
						disabled={isSubmitting}
						id="operation-include-rollover"
						onCheckedChange={(checked) =>
							form.setValue("includeRollOver", checked, {
								shouldDirty: true,
								shouldValidate: true,
							})
						}
					/>
					<FieldContent>
						<FieldLabel htmlFor="operation-include-rollover">
							Incluir rollovers abiertos
						</FieldLabel>
						<FieldDescription>
							Demanda abierta de operaciones previas
						</FieldDescription>
					</FieldContent>
				</Field>

				<Field data-invalid={Boolean(errors.notes)}>
					<FieldLabel htmlFor="operation-notes">Notas</FieldLabel>
					<Textarea
						aria-invalid={Boolean(errors.notes)}
						disabled={isSubmitting}
						id="operation-notes"
						{...form.register("notes")}
					/>
					<FieldError errors={[errors.notes]} />
				</Field>
			</form>
		</CrudFormDialogShell>
	);
}
