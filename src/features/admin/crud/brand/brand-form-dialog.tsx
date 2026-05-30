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
import { brandCreateInputSchema } from "~/schemas/admin/brand.schemas";
import type {
	BrandDetail,
	BrandFormInput,
	BrandFormValues,
} from "~/shared/common/admin-crud/brand.types";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import {
	brandDetailToFormValues,
	defaultBrandFormValues,
} from "./brand.mappers";

export function BrandFormDialog({
	open,
	mode,
	brand,
	isLoadingBrand,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	brand?: BrandDetail;
	isLoadingBrand?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: BrandFormValues) => void;
}) {
	const form = useForm<BrandFormInput, unknown, BrandFormValues>({
		resolver: zodResolver(brandCreateInputSchema),
		defaultValues: defaultBrandFormValues,
	});

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const title = mode === "create" ? "Agregar marca" : "Editar marca";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultBrandFormValues);
			return;
		}

		if (brand) {
			form.reset(brandDetailToFormValues(brand));
		}
	}, [brand, form, mode, open]);

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
						disabled={isSubmitting || (mode === "edit" && isLoadingBrand)}
						form="brand-crud-form"
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
			{mode === "edit" && isLoadingBrand ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="brand-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[12rem_1fr]">
						<Field>
							<FieldLabel htmlFor="brand-id">ID</FieldLabel>
							<Input
								disabled
								id="brand-id"
								value={brand?.id ? String(brand.id) : "Automático"}
							/>
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={active}
								disabled={isSubmitting || brand?.deleted}
								onCheckedChange={(checked) =>
									form.setValue("active", checked, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
							<FieldContent>
								<FieldLabel>Marca activa</FieldLabel>
								<FieldDescription>
									{brand?.deleted ? (
										<CrudStatusBadge
											active={brand.active}
											deleted={brand.deleted}
										/>
									) : (
										"Disponible para asociar a productos nuevos"
									)}
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>

					<FieldGroup>
						<Field data-invalid={Boolean(errors.name)}>
							<FieldLabel htmlFor="brand-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								disabled={isSubmitting}
								id="brand-name"
								{...form.register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field data-invalid={Boolean(errors.logoUrl)}>
							<FieldLabel htmlFor="brand-logo-url">Logo URL</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.logoUrl)}
								disabled={isSubmitting}
								id="brand-logo-url"
								placeholder="https://..."
								{...form.register("logoUrl")}
							/>
							<FieldError errors={[errors.logoUrl]} />
						</Field>
						<Field data-invalid={Boolean(errors.description)}>
							<FieldLabel htmlFor="brand-description">Descripción</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.description)}
								disabled={isSubmitting}
								id="brand-description"
								placeholder="Cómo se presenta la marca en catálogo y operaciones"
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
