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
import { Select } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { addressCreateInputSchema } from "~/schemas/admin/address.schemas";
import type {
	AddressDetail,
	AddressFormInput,
	AddressFormValues,
	AddressType,
} from "~/shared/common/admin-crud/address.types";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import type { UserListItem } from "~/shared/common/admin-crud/user.types";
import {
	addressDetailToFormValues,
	defaultAddressFormValues,
} from "./address.mappers";

const addressTypeOptions: Array<{ label: string; value: AddressType }> = [
	{ label: "General", value: "all" },
	{ label: "Facturación", value: "billing" },
	{ label: "Envío", value: "shipping" },
	{ label: "Otra", value: "other" },
];

export function AddressFormDialog({
	open,
	mode,
	address,
	users,
	isLoadingAddress,
	isLoadingUsers,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	address?: AddressDetail;
	users: UserListItem[];
	isLoadingAddress?: boolean;
	isLoadingUsers?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: AddressFormValues) => void;
}) {
	const form = useForm<AddressFormInput, unknown, AddressFormValues>({
		resolver: zodResolver(addressCreateInputSchema),
		defaultValues: defaultAddressFormValues,
	});

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const title = mode === "create" ? "Agregar dirección" : "Editar dirección";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultAddressFormValues);
			return;
		}

		if (address) {
			form.reset(addressDetailToFormValues(address));
		}
	}, [address, form, mode, open]);

	return (
		<CrudFormDialogShell
			description="La dirección puede administrarse directamente o desde el formulario del usuario propietario."
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
						disabled={isSubmitting || (mode === "edit" && isLoadingAddress)}
						form="address-crud-form"
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
			{mode === "edit" && isLoadingAddress ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="address-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[12rem_1fr]">
						<Field>
							<FieldLabel htmlFor="address-id">ID</FieldLabel>
							<Input
								disabled
								id="address-id"
								value={address?.id ? String(address.id) : "Automático"}
							/>
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={active}
								disabled={isSubmitting || address?.deleted}
								onCheckedChange={(checked) =>
									form.setValue("active", checked, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
							<FieldContent>
								<FieldLabel>Dirección activa</FieldLabel>
								<FieldDescription>
									{address?.deleted ? (
										<CrudStatusBadge
											active={address.active}
											deleted={address.deleted}
										/>
									) : (
										"Disponible para seleccionarse como dirección vigente"
									)}
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>

					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field data-invalid={Boolean(errors.userId)}>
							<FieldLabel htmlFor="address-user-id">Usuario</FieldLabel>
							<Select
								aria-invalid={Boolean(errors.userId)}
								disabled={isSubmitting || isLoadingUsers}
								id="address-user-id"
								{...form.register("userId")}
							>
								<option value="">Seleccioná un usuario</option>
								{users.map((user) => (
									<option key={user.id} value={user.id}>
										{user.name} · {user.email}
										{user.deleted ? " (eliminado)" : ""}
									</option>
								))}
							</Select>
							<FieldDescription>
								{isLoadingUsers
									? "Cargando usuarios..."
									: "La dirección queda asociada al perfil seleccionado."}
							</FieldDescription>
							<FieldError errors={[errors.userId]} />
						</Field>
						<Field data-invalid={Boolean(errors.type)}>
							<FieldLabel htmlFor="address-type">Tipo</FieldLabel>
							<Select id="address-type" {...form.register("type")}>
								{addressTypeOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
							<FieldError errors={[errors.type]} />
						</Field>
						<Field
							className="md:col-span-2"
							data-invalid={Boolean(errors.line1)}
						>
							<FieldLabel htmlFor="address-line1">Dirección</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.line1)}
								disabled={isSubmitting}
								id="address-line1"
								{...form.register("line1")}
							/>
							<FieldError errors={[errors.line1]} />
						</Field>
						<Field
							className="md:col-span-2"
							data-invalid={Boolean(errors.line2)}
						>
							<FieldLabel htmlFor="address-line2">Complemento</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.line2)}
								disabled={isSubmitting}
								id="address-line2"
								{...form.register("line2")}
							/>
							<FieldError errors={[errors.line2]} />
						</Field>
						<Field data-invalid={Boolean(errors.city)}>
							<FieldLabel htmlFor="address-city">Ciudad</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.city)}
								disabled={isSubmitting}
								id="address-city"
								{...form.register("city")}
							/>
							<FieldError errors={[errors.city]} />
						</Field>
						<Field data-invalid={Boolean(errors.state)}>
							<FieldLabel htmlFor="address-state">
								Provincia / Estado
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.state)}
								disabled={isSubmitting}
								id="address-state"
								{...form.register("state")}
							/>
							<FieldError errors={[errors.state]} />
						</Field>
						<Field data-invalid={Boolean(errors.postalCode)}>
							<FieldLabel htmlFor="address-postal-code">
								Código postal
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.postalCode)}
								disabled={isSubmitting}
								id="address-postal-code"
								{...form.register("postalCode")}
							/>
							<FieldError errors={[errors.postalCode]} />
						</Field>
						<Field data-invalid={Boolean(errors.country)}>
							<FieldLabel htmlFor="address-country">País</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.country)}
								disabled={isSubmitting}
								id="address-country"
								{...form.register("country")}
							/>
							<FieldError errors={[errors.country]} />
						</Field>
					</FieldGroup>
				</form>
			)}
		</CrudFormDialogShell>
	);
}
