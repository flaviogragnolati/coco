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
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { categoryCreateInputSchema } from "~/schemas/admin/category.schemas";
import type {
	CategoryDetail,
	CategoryFormInput,
	CategoryFormValues,
} from "~/shared/common/admin-crud/category.types";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import {
	categoryDetailToFormValues,
	defaultCategoryFormValues,
} from "./category.mappers";

export function CategoryFormDialog({
	open,
	mode,
	category,
	defaultSortOrder,
	isLoadingCategory,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	category?: CategoryDetail;
	defaultSortOrder: number;
	isLoadingCategory?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: CategoryFormValues) => void;
}) {
	const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({
		resolver: zodResolver(categoryCreateInputSchema),
		defaultValues: defaultCategoryFormValues,
	});

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const title = mode === "create" ? "Agregar categoría" : "Editar categoría";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset({ ...defaultCategoryFormValues, sortOrder: defaultSortOrder });
			return;
		}

		if (category) {
			form.reset(categoryDetailToFormValues(category));
		}
	}, [category, defaultSortOrder, form, mode, open]);

	return (
		<CrudFormDialogShell
			description="El ID es informativo y se genera automáticamente."
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
						disabled={isSubmitting || (mode === "edit" && isLoadingCategory)}
						form="category-crud-form"
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
			{mode === "edit" && isLoadingCategory ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="category-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[12rem_1fr]">
						<Field>
							<FieldLabel htmlFor="category-id">ID</FieldLabel>
							<Input
								disabled
								id="category-id"
								value={category?.id ? String(category.id) : "Automático"}
							/>
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={active}
								disabled={isSubmitting || category?.deleted}
								onCheckedChange={(checked) =>
									form.setValue("active", checked, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
							<FieldContent>
								<FieldLabel>Categoría activa</FieldLabel>
								<FieldDescription>
									{category?.deleted ? (
										<CrudStatusBadge
											active={category.active}
											deleted={category.deleted}
										/>
									) : (
										"Visible en el catálogo y disponible para productos nuevos"
									)}
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>

					<FieldGroup className="grid gap-4 md:grid-cols-[1fr_10rem]">
						<Field data-invalid={Boolean(errors.name)}>
							<FieldLabel htmlFor="category-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								disabled={isSubmitting}
								id="category-name"
								{...form.register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field data-invalid={Boolean(errors.sortOrder)}>
							<FieldLabel htmlFor="category-sort-order">Orden</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.sortOrder)}
								disabled={isSubmitting}
								id="category-sort-order"
								inputMode="numeric"
								min={0}
								step={1}
								type="number"
								{...form.register("sortOrder", { valueAsNumber: true })}
							/>
							<FieldDescription>Las más bajas van primero.</FieldDescription>
							<FieldError errors={[errors.sortOrder]} />
						</Field>
					</FieldGroup>
				</form>
			)}
		</CrudFormDialogShell>
	);
}
