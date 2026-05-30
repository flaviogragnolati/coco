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
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { carrierCreateInputSchema } from "~/schemas/admin/carrier.schemas";
import type {
	CarrierDetail,
	CarrierFormInput,
	CarrierFormValues,
} from "~/shared/common/admin-crud/carrier.types";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import {
	carrierDetailToFormValues,
	defaultCarrierFormValues,
} from "./carrier.mappers";

export function CarrierFormDialog({
	open,
	mode,
	carrier,
	isLoadingCarrier,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	carrier?: CarrierDetail;
	isLoadingCarrier?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: CarrierFormValues) => void;
}) {
	const form = useForm<CarrierFormInput, unknown, CarrierFormValues>({
		resolver: zodResolver(carrierCreateInputSchema),
		defaultValues: defaultCarrierFormValues,
	});

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const title = mode === "create" ? "Agregar carrier" : "Editar carrier";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultCarrierFormValues);
			return;
		}

		if (carrier) {
			form.reset(carrierDetailToFormValues(carrier));
		}
	}, [carrier, form, mode, open]);

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
						disabled={isSubmitting || (mode === "edit" && isLoadingCarrier)}
						form="carrier-crud-form"
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
			{mode === "edit" && isLoadingCarrier ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-28 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="carrier-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[12rem_1fr]">
						<Field>
							<FieldLabel htmlFor="carrier-id">ID</FieldLabel>
							<Input
								disabled
								id="carrier-id"
								value={carrier?.id ? String(carrier.id) : "Automatico"}
							/>
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={active}
								disabled={isSubmitting || carrier?.deleted}
								onCheckedChange={(checked) =>
									form.setValue("active", checked, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
							<FieldContent>
								<FieldLabel>Carrier activo</FieldLabel>
								<FieldDescription>
									{carrier?.deleted ? (
										<CrudStatusBadge
											active={carrier.active}
											deleted={carrier.deleted}
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
							<FieldLabel htmlFor="carrier-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								disabled={isSubmitting}
								id="carrier-name"
								{...form.register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field data-invalid={Boolean(errors.description)}>
							<FieldLabel htmlFor="carrier-description">Descripcion</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.description)}
								disabled={isSubmitting}
								id="carrier-description"
								{...form.register("description")}
							/>
							<FieldError errors={[errors.description]} />
						</Field>
					</FieldGroup>

					<FieldSet>
						<FieldLegend>Direccion</FieldLegend>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field
								className="md:col-span-2"
								data-invalid={Boolean(errors.address?.line1)}
							>
								<FieldLabel htmlFor="carrier-address-line1">
									Direccion
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.line1)}
									disabled={isSubmitting}
									id="carrier-address-line1"
									{...form.register("address.line1")}
								/>
								<FieldError errors={[errors.address?.line1]} />
							</Field>
							<Field
								className="md:col-span-2"
								data-invalid={Boolean(errors.address?.line2)}
							>
								<FieldLabel htmlFor="carrier-address-line2">
									Complemento
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.line2)}
									disabled={isSubmitting}
									id="carrier-address-line2"
									{...form.register("address.line2")}
								/>
								<FieldError errors={[errors.address?.line2]} />
							</Field>
							<Field data-invalid={Boolean(errors.address?.city)}>
								<FieldLabel htmlFor="carrier-address-city">Ciudad</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.city)}
									disabled={isSubmitting}
									id="carrier-address-city"
									{...form.register("address.city")}
								/>
								<FieldError errors={[errors.address?.city]} />
							</Field>
							<Field data-invalid={Boolean(errors.address?.state)}>
								<FieldLabel htmlFor="carrier-address-state">
									Provincia / Estado
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.state)}
									disabled={isSubmitting}
									id="carrier-address-state"
									{...form.register("address.state")}
								/>
								<FieldError errors={[errors.address?.state]} />
							</Field>
							<Field data-invalid={Boolean(errors.address?.postalCode)}>
								<FieldLabel htmlFor="carrier-address-postal-code">
									Codigo postal
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.postalCode)}
									disabled={isSubmitting}
									id="carrier-address-postal-code"
									{...form.register("address.postalCode")}
								/>
								<FieldError errors={[errors.address?.postalCode]} />
							</Field>
							<Field data-invalid={Boolean(errors.address?.country)}>
								<FieldLabel htmlFor="carrier-address-country">Pais</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.address?.country)}
									disabled={isSubmitting}
									id="carrier-address-country"
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
								<FieldLabel htmlFor="carrier-contact-name">
									Nombre de contacto
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.contactInfo?.contactName)}
									disabled={isSubmitting}
									id="carrier-contact-name"
									{...form.register("contactInfo.contactName")}
								/>
								<FieldError errors={[errors.contactInfo?.contactName]} />
							</Field>
							<Field data-invalid={Boolean(errors.contactInfo?.email)}>
								<FieldLabel htmlFor="carrier-contact-email">Email</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.contactInfo?.email)}
									disabled={isSubmitting}
									id="carrier-contact-email"
									{...form.register("contactInfo.email")}
								/>
								<FieldError errors={[errors.contactInfo?.email]} />
							</Field>
							<Field data-invalid={Boolean(errors.contactInfo?.phone)}>
								<FieldLabel htmlFor="carrier-contact-phone">
									Telefono
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.contactInfo?.phone)}
									disabled={isSubmitting}
									id="carrier-contact-phone"
									{...form.register("contactInfo.phone")}
								/>
								<FieldError errors={[errors.contactInfo?.phone]} />
							</Field>
							<Field data-invalid={Boolean(errors.contactInfo?.whatsapp)}>
								<FieldLabel htmlFor="carrier-contact-whatsapp">
									WhatsApp
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.contactInfo?.whatsapp)}
									disabled={isSubmitting}
									id="carrier-contact-whatsapp"
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
