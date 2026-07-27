"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCwIcon } from "lucide-react";
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
	OperationDetail,
} from "~/shared/common/admin-crud/operation.types";
import { rerunOperationFormValues } from "./operation.mappers";

const rerunNoticeByStatus: Partial<Record<OperationDetail["status"], string>> =
	{
		completed:
			"La operación de origen se compensa primero: sus lotes y órdenes se cancelan y su demanda vuelve a la cola. Todo ocurre en una sola transacción.",
		failed:
			"La operación fallida se reejecuta en el lugar con los parámetros de abajo.",
		cancelled:
			"Se crea y ejecuta una operación nueva; la cancelada queda como está.",
	};

export function OperationRerunDialog({
	open,
	operation,
	destinations,
	isLoadingDestinations,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	operation?: OperationDetail;
	destinations: DestinationListItem[];
	isLoadingDestinations?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: OperationCreateFormValues) => void;
}) {
	const activeDestinations = destinations.filter(
		(destination) => destination.active && !destination.deleted,
	);
	// The same refinement the server applies, so `to < from` is rejected here too.
	const form = useForm<
		OperationCreateFormInput,
		unknown,
		OperationCreateFormValues
	>({
		resolver: zodResolver(operationCreateInputSchema),
	});
	const errors = form.formState.errors;
	const includeRollOver = Boolean(form.watch("includeRollOver"));

	useEffect(() => {
		if (!open || !operation) return;
		form.reset(rerunOperationFormValues(operation));
	}, [form, open, operation]);

	return (
		<CrudFormDialogShell
			description="Los parámetros se precargan de la operación original y se pueden editar antes de reejecutar."
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
						disabled={
							isSubmitting ||
							isLoadingDestinations ||
							activeDestinations.length === 0
						}
						form="operation-rerun-form"
						type="submit"
						variant="highlight"
					>
						<RefreshCwIcon data-icon="inline-start" />
						Reejecutar
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Reejecutar ${operation?.code ?? "operación"}`}
		>
			{operation ? (
				<p className="text-muted-foreground text-xs">
					{rerunNoticeByStatus[operation.status]}
				</p>
			) : null}

			<form
				className="flex flex-col gap-5"
				id="operation-rerun-form"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				<FieldGroup className="grid gap-4 md:grid-cols-2">
					<Field data-invalid={Boolean(errors.from)}>
						<FieldLabel htmlFor="operation-rerun-from">Desde</FieldLabel>
						<Input
							aria-invalid={Boolean(errors.from)}
							disabled={isSubmitting}
							id="operation-rerun-from"
							type="datetime-local"
							{...form.register("from")}
						/>
						<FieldError errors={[errors.from]} />
					</Field>
					<Field data-invalid={Boolean(errors.to)}>
						<FieldLabel htmlFor="operation-rerun-to">Hasta</FieldLabel>
						<Input
							aria-invalid={Boolean(errors.to)}
							disabled={isSubmitting}
							id="operation-rerun-to"
							type="datetime-local"
							{...form.register("to")}
						/>
						<FieldError errors={[errors.to]} />
					</Field>
				</FieldGroup>

				<FieldGroup className="grid gap-4 md:grid-cols-[1fr_12rem]">
					<Field data-invalid={Boolean(errors.destinationId)}>
						<FieldLabel htmlFor="operation-rerun-destination">
							Destino
						</FieldLabel>
						<Select
							aria-invalid={Boolean(errors.destinationId)}
							disabled={isSubmitting || isLoadingDestinations}
							id="operation-rerun-destination"
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
						<FieldLabel htmlFor="operation-rerun-strategy">
							Estrategia
						</FieldLabel>
						<Select
							disabled
							id="operation-rerun-strategy"
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
						id="operation-rerun-include-rollover"
						onCheckedChange={(checked) =>
							form.setValue("includeRollOver", checked, {
								shouldDirty: true,
								shouldValidate: true,
							})
						}
					/>
					<FieldContent>
						<FieldLabel htmlFor="operation-rerun-include-rollover">
							Incluir rollovers abiertos
						</FieldLabel>
						<FieldDescription>
							Sin esto la demanda que libera la compensación queda parada
						</FieldDescription>
					</FieldContent>
				</Field>

				<Field data-invalid={Boolean(errors.notes)}>
					<FieldLabel htmlFor="operation-rerun-notes">Notas</FieldLabel>
					<Textarea
						aria-invalid={Boolean(errors.notes)}
						disabled={isSubmitting}
						id="operation-rerun-notes"
						{...form.register("notes")}
					/>
					<FieldError errors={[errors.notes]} />
				</Field>
			</form>
		</CrudFormDialogShell>
	);
}
