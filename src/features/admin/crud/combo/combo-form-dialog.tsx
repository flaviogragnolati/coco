"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	PlusIcon,
	SaveIcon,
	Trash2Icon,
	TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Combobox, type ComboboxOption } from "~/components/ui/combobox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { comboCreateInputSchema } from "~/schemas/admin/combo.schemas";
import type {
	ComboCreateInput,
	ComboDetail,
	ComboProductOption,
} from "~/shared/common/admin-crud/combo.types";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import { parseQuantityInput } from "~/shared/common/commerce.helpers";
import {
	comboDetailToFormValues,
	comboQuantityToSubmit,
	defaultComboFormValues,
	describeComboQuantityRule,
} from "./combo.mappers";

// The quantity is typed in es-AR ("0,5"); it becomes the server's decimal on submit.
const comboFormSchema = comboCreateInputSchema.extend({
	items: z
		.array(
			z.object({
				productId: z.number().int().positive("Elegí un producto"),
				quantity: z.string().refine((value) => {
					const parsed = parseQuantityInput(value);
					return parsed !== null && parsed > 0;
				}, "Ingresá una cantidad mayor a cero"),
			}),
		)
		.min(1, "Agregá al menos un producto")
		.max(20, "Hasta 20 productos por combo"),
});

type ComboFormInput = z.input<typeof comboFormSchema>;
type ComboFormOutput = z.output<typeof comboFormSchema>;

const GROUP_OPTIONS_ID = "combo-group-options";

export function ComboFormDialog({
	open,
	mode,
	combo,
	productOptions,
	groupNames,
	isLoadingCombo,
	isSubmitting,
	serverError,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	combo?: ComboDetail;
	productOptions: ComboProductOption[];
	groupNames: string[];
	isLoadingCombo?: boolean;
	isSubmitting?: boolean;
	serverError?: string | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: ComboCreateInput) => void;
}) {
	const form = useForm<ComboFormInput, unknown, ComboFormOutput>({
		resolver: zodResolver(comboFormSchema),
		defaultValues: defaultComboFormValues,
	});
	const items = useFieldArray({ control: form.control, name: "items" });

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const watchedItems = form.watch("items");
	const title = mode === "create" ? "Agregar combo" : "Editar combo";

	const optionById = useMemo(
		() => new Map(productOptions.map((option) => [option.productId, option])),
		[productOptions],
	);
	const comboboxOptions = useMemo<ComboboxOption[]>(
		() =>
			productOptions.map((option) => ({
				value: String(option.productId),
				label: option.name,
			})),
		[productOptions],
	);

	useEffect(() => {
		if (!open) return;
		if (mode === "create") {
			form.reset(defaultComboFormValues);
			return;
		}
		if (combo) form.reset(comboDetailToFormValues(combo));
	}, [combo, form, mode, open]);

	const submit = (values: ComboFormOutput) =>
		onSubmit({
			...values,
			items: values.items.map((item) => ({
				productId: item.productId,
				quantity: comboQuantityToSubmit(item.quantity),
			})),
		});

	return (
		<CrudFormDialogShell
			description="Un combo suma sus productos al pedido, cada uno a su precio de hoy. No tiene precio ni stock propios."
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
						disabled={isSubmitting || (mode === "edit" && isLoadingCombo)}
						form="combo-crud-form"
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
			{mode === "edit" && isLoadingCombo ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="combo-crud-form"
					onSubmit={form.handleSubmit(submit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[1fr_auto]">
						<Field data-invalid={Boolean(errors.name)}>
							<FieldLabel htmlFor="combo-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								disabled={isSubmitting}
								id="combo-name"
								{...form.register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={active}
								disabled={isSubmitting || combo?.deleted}
								onCheckedChange={(checked) =>
									form.setValue("active", checked, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
							<FieldContent>
								<FieldLabel>Combo activo</FieldLabel>
								<FieldDescription>
									{combo?.deleted ? (
										<CrudStatusBadge
											active={combo.active}
											deleted={combo.deleted}
										/>
									) : (
										"Se puede mostrar en el home"
									)}
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>

					<Field data-invalid={Boolean(errors.description)}>
						<FieldLabel htmlFor="combo-description">Descripción</FieldLabel>
						<Textarea
							aria-invalid={Boolean(errors.description)}
							disabled={isSubmitting}
							id="combo-description"
							rows={3}
							{...form.register("description")}
						/>
						<FieldError errors={[errors.description]} />
					</Field>

					<FieldGroup className="grid gap-4 md:grid-cols-[1fr_10rem]">
						<Field data-invalid={Boolean(errors.groupName)}>
							<FieldLabel htmlFor="combo-group">Grupo</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.groupName)}
								disabled={isSubmitting}
								id="combo-group"
								list={GROUP_OPTIONS_ID}
								placeholder="Sin grupo"
								{...form.register("groupName")}
							/>
							<datalist id={GROUP_OPTIONS_ID}>
								{groupNames.map((name) => (
									<option key={name} value={name} />
								))}
							</datalist>
							<FieldDescription>
								Los combos del mismo grupo se muestran en una sola tarjeta, con
								un selector de personas.
							</FieldDescription>
							<FieldError errors={[errors.groupName]} />
						</Field>
						<Field data-invalid={Boolean(errors.people)}>
							<FieldLabel htmlFor="combo-people">Personas</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.people)}
								disabled={isSubmitting}
								id="combo-people"
								inputMode="numeric"
								max={20}
								min={1}
								step={1}
								type="number"
								{...form.register("people", {
									setValueAs: (value: unknown) =>
										value === "" || value === null || value === undefined
											? null
											: Number(value),
								})}
							/>
							<FieldDescription>
								Para la tarjeta del home: "1 persona", "2 personas". Obligatorio
								si el combo tiene grupo.
							</FieldDescription>
							<FieldError errors={[errors.people]} />
						</Field>
					</FieldGroup>

					<FieldSet>
						<FieldLegend>Productos</FieldLegend>
						<FieldDescription>
							Solo productos con precio vigente. La cantidad tiene que ser una
							que el pedido acepte tal cual.
						</FieldDescription>
						<ul className="flex flex-col gap-3">
							{items.fields.map((field, index) => {
								const productId = watchedItems?.[index]?.productId ?? 0;
								const option = optionById.get(productId);
								const itemErrors = errors.items?.[index];
								return (
									<li
										className="grid items-start gap-2 md:grid-cols-[1fr_9rem_auto]"
										key={field.id}
									>
										<Field data-invalid={Boolean(itemErrors?.productId)}>
											<FieldLabel
												className="sr-only"
												htmlFor={`combo-item-${index}-product`}
											>
												Producto {index + 1}
											</FieldLabel>
											<Combobox
												disabled={isSubmitting}
												emptyText="Sin productos con precio vigente"
												id={`combo-item-${index}-product`}
												invalid={Boolean(itemErrors?.productId)}
												onChange={(value) =>
													form.setValue(
														`items.${index}.productId`,
														Number(value),
														{
															shouldDirty: true,
															shouldValidate: true,
														},
													)
												}
												options={comboboxOptions}
												placeholder="Elegí un producto"
												searchPlaceholder="Buscar producto..."
												value={productId > 0 ? String(productId) : null}
											/>
											<FieldError errors={[itemErrors?.productId]} />
										</Field>
										<Field data-invalid={Boolean(itemErrors?.quantity)}>
											<FieldLabel
												className="sr-only"
												htmlFor={`combo-item-${index}-quantity`}
											>
												Cantidad del producto {index + 1}
											</FieldLabel>
											<Input
												aria-invalid={Boolean(itemErrors?.quantity)}
												disabled={isSubmitting}
												id={`combo-item-${index}-quantity`}
												inputMode="decimal"
												placeholder="Cantidad"
												{...form.register(`items.${index}.quantity`)}
											/>
											{option ? (
												<FieldDescription>
													{describeComboQuantityRule(option)}
												</FieldDescription>
											) : null}
											<FieldError errors={[itemErrors?.quantity]} />
										</Field>
										<Button
											aria-label={`Quitar producto ${index + 1}`}
											disabled={isSubmitting || items.fields.length === 1}
											onClick={() => items.remove(index)}
											type="button"
											variant="outline"
										>
											<Trash2Icon data-icon="inline-start" />
											Quitar
										</Button>
									</li>
								);
							})}
						</ul>
						<FieldError errors={[errors.items?.root ?? errors.items]} />
						<div>
							<Button
								disabled={isSubmitting || items.fields.length >= 20}
								onClick={() => items.append({ productId: 0, quantity: "" })}
								type="button"
								variant="outline"
							>
								<PlusIcon data-icon="inline-start" />
								Agregar producto
							</Button>
						</div>
					</FieldSet>

					{serverError ? (
						<Alert variant="destructive">
							<TriangleAlertIcon />
							<AlertDescription>{serverError}</AlertDescription>
						</Alert>
					) : null}
				</form>
			)}
		</CrudFormDialogShell>
	);
}
