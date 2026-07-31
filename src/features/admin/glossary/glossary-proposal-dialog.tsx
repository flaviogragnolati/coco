"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SendIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { glossaryProposalCreateInputSchema } from "~/schemas/admin/glossary-proposal.schemas";
import type {
	GlossaryProposalCreateInput,
	GlossaryProposalField,
	GlossaryProposalFormInput,
} from "~/shared/common/admin-crud/glossary-proposal.types";
import { api } from "~/trpc/react";
import { type GlossaryEntry, glossaryKindLabels } from "./glossary.types";
import { glossaryProposalFieldOptions } from "./glossary-proposal.mappers";

/**
 * What the proposal is arguing against, as text. It travels to the server as
 * `currentValue`: the snapshot is the only thing that keeps the proposal
 * readable once the dataset moves on (ADR 0007).
 */
function currentValueOf(entry: GlossaryEntry, field: GlossaryProposalField) {
	if (field === "label") return entry.label;
	if (field === "definition") return entry.definition ?? "—";

	const occurrences = entry.occurrences ?? [];
	if (occurrences.length === 0) return "—";

	return occurrences
		.map((occurrence) => `${occurrence.code} → ${occurrence.db}`)
		.join(", ");
}

export function GlossaryProposalDialog({
	entry,
	open,
	onOpenChange,
}: {
	entry?: GlossaryEntry;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const utils = api.useUtils();
	const form = useForm<
		GlossaryProposalFormInput,
		unknown,
		GlossaryProposalCreateInput
	>({
		resolver: zodResolver(glossaryProposalCreateInputSchema),
		defaultValues: { field: "label", proposed: "", reason: "" },
	});

	const errors = form.formState.errors;
	const field = (form.watch("field") ?? "label") as GlossaryProposalField;
	const currentValue = entry ? currentValueOf(entry, field) : "";

	useEffect(() => {
		if (!open || !entry) return;

		form.reset({
			entrySlug: entry.slug,
			entryLabel: entry.label,
			field: "label",
			proposed: "",
			reason: "",
		});
	}, [entry, form, open]);

	const createMutation = api.admin.glossaryProposal.create.useMutation({
		onSuccess: async () => {
			toast.success("Propuesta registrada");
			onOpenChange(false);
			await utils.admin.glossaryProposal.list.invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo registrar la propuesta");
		},
	});

	const isSubmitting = createMutation.isPending;

	return (
		<CrudFormDialogShell
			contentClassName="sm:max-w-xl"
			description="La propuesta no cambia el glosario: queda registrada para que alguien la aplique en el código."
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
						disabled={isSubmitting || !entry}
						form="glossary-proposal-form"
						type="submit"
						variant="highlight"
					>
						<SendIcon data-icon="inline-start" />
						Proponer
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title="Proponer cambio"
		>
			{entry ? (
				<form
					className="flex flex-col gap-5"
					id="glossary-proposal-form"
					onSubmit={form.handleSubmit((values) =>
						createMutation.mutate({ ...values, currentValue }),
					)}
				>
					<div className="flex flex-wrap items-center gap-2 rounded-2xl border p-3">
						<span className="font-medium text-sm">{entry.label}</span>
						<Badge variant="outline">{glossaryKindLabels[entry.kind]}</Badge>
					</div>

					<FieldGroup>
						<Field data-invalid={Boolean(errors.field)}>
							<FieldLabel htmlFor="glossary-proposal-field">
								¿Qué querés cambiar?
							</FieldLabel>
							<Select
								aria-invalid={Boolean(errors.field)}
								disabled={isSubmitting}
								id="glossary-proposal-field"
								{...form.register("field")}
							>
								{glossaryProposalFieldOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
							<FieldError errors={[errors.field]} />
						</Field>

						<Field>
							<FieldLabel htmlFor="glossary-proposal-current">
								Valor actual
							</FieldLabel>
							<p
								className="whitespace-pre-line rounded-2xl border bg-muted/30 p-3 text-muted-foreground text-sm"
								id="glossary-proposal-current"
							>
								{currentValue}
							</p>
						</Field>

						<Field data-invalid={Boolean(errors.proposed)}>
							<FieldLabel htmlFor="glossary-proposal-proposed">
								Propuesta
							</FieldLabel>
							{field === "definition" ? (
								<Textarea
									aria-invalid={Boolean(errors.proposed)}
									disabled={isSubmitting}
									id="glossary-proposal-proposed"
									rows={4}
									{...form.register("proposed")}
								/>
							) : (
								<Input
									aria-invalid={Boolean(errors.proposed)}
									disabled={isSubmitting}
									id="glossary-proposal-proposed"
									{...form.register("proposed")}
								/>
							)}
							<FieldError errors={[errors.proposed]} />
						</Field>

						<Field data-invalid={Boolean(errors.reason)}>
							<FieldLabel htmlFor="glossary-proposal-reason">
								Motivo (opcional)
							</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.reason)}
								disabled={isSubmitting}
								id="glossary-proposal-reason"
								placeholder="Qué confunde hoy, o con qué palabra se lo nombra en la práctica"
								rows={3}
								{...form.register("reason")}
							/>
							<FieldError errors={[errors.reason]} />
						</Field>
					</FieldGroup>
				</form>
			) : null}
		</CrudFormDialogShell>
	);
}
