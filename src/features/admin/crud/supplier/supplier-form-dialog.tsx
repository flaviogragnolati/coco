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
	FieldLegend,
	FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { supplierCreateInputSchema } from "~/schemas/admin/supplier.schemas";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import type {
	SupplierDetail,
	SupplierFormInput,
	SupplierFormValues,
} from "~/shared/common/admin-crud/supplier.types";
import {
	defaultSupplierFormValues,
	supplierDetailToFormValues,
} from "./supplier.mappers";

export function SupplierFormDialog({
	open,
	mode,
	supplier,
	isLoadingSupplier,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	supplier?: SupplierDetail;
	isLoadingSupplier?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: SupplierFormValues) => void;
}) {
	const form = useForm<SupplierFormInput, unknown, SupplierFormValues>({
		resolver: zodResolver(supplierCreateInputSchema),
		defaultValues: defaultSupplierFormValues,
	});

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const title =
		mode === "create" ? "Agregar proveedor" : "Editar proveedor";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultSupplierFormValues);
			return;
		}

		if (supplier) {
			form.reset(supplierDetailToFormValues(supplier));
		}
	}, [form, mode, open, supplier]);

	return (
		<CrudFormDialogShell
			description="El ID es informativo y no se puede modificar."
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
						disabled={isSubmitting || (mode === "edit" && isLoadingSupplier)}
						form="supplier-crud-form"
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
			{mode === "edit" && isLoadingSupplier ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-28 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="supplier-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[12rem_1fr]">
						<Field>
							<FieldLabel htmlFor="supplier-id">ID</FieldLabel>
							<Input
								disabled
								id="supplier-id"
								value={supplier?.id ? String(supplier.id) : "Automático"}
							/>
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={active}
								disabled={isSubmitting || supplier?.deleted}
								onCheckedChange={(checked) =>
									form.setValue("active", checked, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
							<FieldContent>
								<FieldLabel>Proveedor activo</FieldLabel>
								<FieldDescription>
									{supplier?.deleted ? (
										<CrudStatusBadge
											active={supplier.active}
											deleted={supplier.deleted}
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
							<FieldLabel htmlFor="supplier-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								disabled={isSubmitting}
								id="supplier-name"
								{...form.register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field data-invalid={Boolean(errors.description)}>
							<FieldLabel htmlFor="supplier-description">Descripción</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.description)}
								disabled={isSubmitting}
								id="supplier-description"
								{...form.register("description")}
							/>
							<FieldError errors={[errors.description]} />
						</Field>
					</FieldGroup>

					<FieldSet>
						<FieldLegend>Dirección</FieldLegend>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field
								className="md:col-span-2"
								data-invalid={Boolean(errors.address?.line1)}
							>
								<FieldLabel htmlFor="supplier-address-line1">
									Dirección
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.line1)}
									disabled={isSubmitting}
									id="supplier-address-line1"
									{...form.register("address.line1")}
								/>
								<FieldError errors={[errors.address?.line1]} />
							</Field>
							<Field
								className="md:col-span-2"
								data-invalid={Boolean(errors.address?.line2)}
							>
								<FieldLabel htmlFor="supplier-address-line2">
									Complemento
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.line2)}
									disabled={isSubmitting}
									id="supplier-address-line2"
									{...form.register("address.line2")}
								/>
								<FieldError errors={[errors.address?.line2]} />
							</Field>
							<Field data-invalid={Boolean(errors.address?.city)}>
								<FieldLabel htmlFor="supplier-address-city">Ciudad</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.city)}
									disabled={isSubmitting}
									id="supplier-address-city"
									{...form.register("address.city")}
								/>
								<FieldError errors={[errors.address?.city]} />
							</Field>
							<Field data-invalid={Boolean(errors.address?.state)}>
								<FieldLabel htmlFor="supplier-address-state">
									Provincia / Estado
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.state)}
									disabled={isSubmitting}
									id="supplier-address-state"
									{...form.register("address.state")}
								/>
								<FieldError errors={[errors.address?.state]} />
							</Field>
							<Field data-invalid={Boolean(errors.address?.postalCode)}>
								<FieldLabel htmlFor="supplier-address-postal-code">
									Código postal
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.postalCode)}
									disabled={isSubmitting}
									id="supplier-address-postal-code"
									{...form.register("address.postalCode")}
								/>
								<FieldError errors={[errors.address?.postalCode]} />
							</Field>
							<Field data-invalid={Boolean(errors.address?.country)}>
								<FieldLabel htmlFor="supplier-address-country">País</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.country)}
									disabled={isSubmitting}
									id="supplier-address-country"
									{...form.register("address.country")}
								/>
								<FieldError errors={[errors.address?.country]} />
							</Field>
						</FieldGroup>
					</FieldSet>

					<FieldSet>
						<FieldLegend>Contacto</FieldLegend>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field
								className="md:col-span-2"
								data-invalid={Boolean(errors.contactInfo?.contactName)}
							>
								<FieldLabel htmlFor="supplier-contact-name">
									Nombre de contacto
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.contactInfo?.contactName)}
									disabled={isSubmitting}
									id="supplier-contact-name"
									{...form.register("contactInfo.contactName")}
								/>
								<FieldError errors={[errors.contactInfo?.contactName]} />
							</Field>
							<Field data-invalid={Boolean(errors.contactInfo?.email)}>
								<FieldLabel htmlFor="supplier-contact-email">Email</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.contactInfo?.email)}
									disabled={isSubmitting}
									id="supplier-contact-email"
									{...form.register("contactInfo.email")}
								/>
								<FieldError errors={[errors.contactInfo?.email]} />
							</Field>
							<Field data-invalid={Boolean(errors.contactInfo?.phone)}>
								<FieldLabel htmlFor="supplier-contact-phone">Teléfono</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.contactInfo?.phone)}
									disabled={isSubmitting}
									id="supplier-contact-phone"
									{...form.register("contactInfo.phone")}
								/>
								<FieldError errors={[errors.contactInfo?.phone]} />
							</Field>
							<Field data-invalid={Boolean(errors.contactInfo?.whatsapp)}>
								<FieldLabel htmlFor="supplier-contact-whatsapp">
									WhatsApp
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.contactInfo?.whatsapp)}
									disabled={isSubmitting}
									id="supplier-contact-whatsapp"
									{...form.register("contactInfo.whatsapp")}
								/>
								<FieldError errors={[errors.contactInfo?.whatsapp]} />
							</Field>
						</FieldGroup>
					</FieldSet>
				</form>
			)}
		</CrudFormDialogShell>
	);
}
