"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
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
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { qaTicketCreateInputSchema } from "~/schemas/admin/qa-ticket.schemas";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import type {
	QaTicketDetail,
	QaTicketFormInput,
	QaTicketFormValues,
} from "~/shared/common/admin-crud/qa-ticket.types";
import {
	defaultQaTicketFormValues,
	qaTicketDetailToFormValues,
	qaTicketStatusOptions,
} from "./qa-ticket.mappers";

const unassignedValue = "unassigned";

export function QaTicketFormDialog({
	open,
	mode,
	ticket,
	isLoadingTicket,
	isSubmitting,
	assigneeOptions,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	ticket?: QaTicketDetail;
	isLoadingTicket?: boolean;
	isSubmitting?: boolean;
	assigneeOptions: ComboboxOption[];
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: QaTicketFormValues) => void;
}) {
	const form = useForm<QaTicketFormInput, unknown, QaTicketFormValues>({
		resolver: zodResolver(qaTicketCreateInputSchema),
		defaultValues: defaultQaTicketFormValues,
	});

	const errors = form.formState.errors;
	const isRegressionPath = Boolean(form.watch("isRegressionPath"));
	const assigneeId = form.watch("assigneeId");
	const title =
		mode === "create"
			? "Agregar ticket de QA"
			: `Editar ticket${ticket ? ` #${ticket.code}` : ""}`;

	const comboboxOptions = useMemo<ComboboxOption[]>(
		() => [
			{ value: unassignedValue, label: "Sin asignar" },
			...assigneeOptions,
		],
		[assigneeOptions],
	);

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultQaTicketFormValues);
			return;
		}

		if (ticket) {
			form.reset(qaTicketDetailToFormValues(ticket));
		}
	}, [form, mode, open, ticket]);

	return (
		<CrudFormDialogShell
			description="El número del ticket lo asigna el sistema y no se puede modificar."
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
						disabled={isSubmitting || (mode === "edit" && isLoadingTicket)}
						form="qa-ticket-crud-form"
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
			{mode === "edit" && isLoadingTicket ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-28 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="qa-ticket-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field data-invalid={Boolean(errors.section)}>
							<FieldLabel htmlFor="qa-ticket-section">Sección</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.section)}
								disabled={isSubmitting}
								id="qa-ticket-section"
								placeholder="A. Acceso y sesión"
								{...form.register("section")}
							/>
							<FieldError errors={[errors.section]} />
						</Field>
						<Field data-invalid={Boolean(errors.actor)}>
							<FieldLabel htmlFor="qa-ticket-actor">Quién</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.actor)}
								disabled={isSubmitting}
								id="qa-ticket-actor"
								placeholder="Cliente, Admin, Cliente + Admin…"
								{...form.register("actor")}
							/>
							<FieldError errors={[errors.actor]} />
						</Field>
						<Field
							className="md:col-span-2"
							data-invalid={Boolean(errors.title)}
						>
							<FieldLabel htmlFor="qa-ticket-title">Título</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.title)}
								disabled={isSubmitting}
								id="qa-ticket-title"
								{...form.register("title")}
							/>
							<FieldError errors={[errors.title]} />
						</Field>
						<Field
							className="md:col-span-2"
							data-invalid={Boolean(errors.feature)}
						>
							<FieldLabel htmlFor="qa-ticket-feature">Feature</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.feature)}
								disabled={isSubmitting}
								id="qa-ticket-feature"
								{...form.register("feature")}
							/>
							<FieldError errors={[errors.feature]} />
						</Field>
					</FieldGroup>

					<FieldGroup>
						<Field data-invalid={Boolean(errors.steps)}>
							<FieldLabel htmlFor="qa-ticket-steps">Flujo</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.steps)}
								disabled={isSubmitting}
								id="qa-ticket-steps"
								rows={5}
								{...form.register("steps")}
							/>
							<FieldError errors={[errors.steps]} />
						</Field>
						<Field data-invalid={Boolean(errors.expectedResult)}>
							<FieldLabel htmlFor="qa-ticket-expected-result">
								Resultado esperado
							</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.expectedResult)}
								disabled={isSubmitting}
								id="qa-ticket-expected-result"
								rows={5}
								{...form.register("expectedResult")}
							/>
							<FieldError errors={[errors.expectedResult]} />
						</Field>
						<Field data-invalid={Boolean(errors.notes)}>
							<FieldLabel htmlFor="qa-ticket-notes">Notas</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.notes)}
								disabled={isSubmitting}
								id="qa-ticket-notes"
								rows={3}
								{...form.register("notes")}
							/>
							<FieldError errors={[errors.notes]} />
						</Field>
					</FieldGroup>

					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field data-invalid={Boolean(errors.status)}>
							<FieldLabel htmlFor="qa-ticket-status">Estado</FieldLabel>
							<Select
								aria-invalid={Boolean(errors.status)}
								disabled={isSubmitting}
								id="qa-ticket-status"
								{...form.register("status")}
							>
								{qaTicketStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
							<FieldError errors={[errors.status]} />
						</Field>
						<Field data-invalid={Boolean(errors.assigneeId)}>
							<FieldLabel htmlFor="qa-ticket-assignee">Asignado</FieldLabel>
							<Combobox
								disabled={isSubmitting}
								id="qa-ticket-assignee"
								invalid={Boolean(errors.assigneeId)}
								onChange={(next) =>
									form.setValue(
										"assigneeId",
										next === unassignedValue ? undefined : next,
										{ shouldDirty: true, shouldValidate: true },
									)
								}
								options={comboboxOptions}
								placeholder="Sin asignar"
								searchPlaceholder="Buscar usuario..."
								value={assigneeId ?? unassignedValue}
							/>
							<FieldError errors={[errors.assigneeId]} />
						</Field>
						<Field className="md:col-span-2" orientation="horizontal">
							<Switch
								checked={isRegressionPath}
								disabled={isSubmitting}
								onCheckedChange={(checked) =>
									form.setValue("isRegressionPath", checked, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
							<FieldContent>
								<FieldLabel>Cadena de regresión</FieldLabel>
								<FieldDescription>
									Entra en la pasada corta de punta a punta
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</form>
			)}
		</CrudFormDialogShell>
	);
}
