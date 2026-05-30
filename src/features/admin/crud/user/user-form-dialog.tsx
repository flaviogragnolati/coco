"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";

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
import { Select } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { userCreateInputSchema } from "~/schemas/admin/user.schemas";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import type {
	UserDetail,
	UserFormInput,
	UserFormValues,
	UserRole,
} from "~/shared/common/admin-crud/user.types";
import {
	defaultUserFormValues,
	emptyUserAddressFormValue,
	userDetailToFormValues,
} from "./user.mappers";

const userRoleOptions: Array<{ label: string; value: UserRole }> = [
	{ label: "Cliente", value: "user" },
	{ label: "Administrador", value: "admin" },
	{ label: "Superadministrador", value: "superadmin" },
];

const addressTypeOptions: Array<{
	label: string;
	value: UserFormValues["addresses"][number]["type"];
}> = [
	{ label: "General", value: "all" },
	{ label: "Facturación", value: "billing" },
	{ label: "Envío", value: "shipping" },
	{ label: "Otra", value: "other" },
];

export function UserFormDialog({
	open,
	mode,
	user,
	isLoadingUser,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	user?: UserDetail;
	isLoadingUser?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: UserFormValues) => void;
}) {
	const form = useForm<UserFormInput, unknown, UserFormValues>({
		resolver: zodResolver(userCreateInputSchema),
		defaultValues: defaultUserFormValues,
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "addresses",
	});

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const emailVerified = Boolean(form.watch("emailVerified"));
	const watchedAddresses = form.watch("addresses");
	const title = mode === "create" ? "Agregar usuario" : "Editar usuario";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultUserFormValues);
			return;
		}

		if (user) {
			form.reset(userDetailToFormValues(user));
		}
	}, [form, mode, open, user]);

	return (
		<CrudFormDialogShell
			description="Las direcciones se guardan junto con el perfil. Las que saques del formulario se envían a papelera al actualizar."
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
						disabled={isSubmitting || (mode === "edit" && isLoadingUser)}
						form="user-crud-form"
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
			{mode === "edit" && isLoadingUser ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-28 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="user-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[12rem_1fr]">
						<Field>
							<FieldLabel htmlFor="user-id">ID</FieldLabel>
							<Input
								disabled
								id="user-id"
								value={user?.id ?? "UUID automático"}
							/>
						</Field>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field orientation="horizontal">
								<Switch
									checked={active}
									disabled={isSubmitting || user?.deleted}
									onCheckedChange={(checked) =>
										form.setValue("active", checked, {
											shouldDirty: true,
											shouldValidate: true,
										})
									}
								/>
								<FieldContent>
									<FieldLabel>Usuario activo</FieldLabel>
									<FieldDescription>
										{user?.deleted ? (
											<CrudStatusBadge
												active={user.active}
												deleted={user.deleted}
											/>
										) : (
											"Disponible para sesiones y operaciones nuevas"
										)}
									</FieldDescription>
								</FieldContent>
							</Field>
							<Field orientation="horizontal">
								<Switch
									checked={emailVerified}
									disabled={isSubmitting}
									onCheckedChange={(checked) =>
										form.setValue("emailVerified", checked, {
											shouldDirty: true,
											shouldValidate: true,
										})
									}
								/>
								<FieldContent>
									<FieldLabel>Email verificado</FieldLabel>
									<FieldDescription>
										Marca el estado del perfil, no crea credenciales.
									</FieldDescription>
								</FieldContent>
							</Field>
						</FieldGroup>
					</FieldGroup>

					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field data-invalid={Boolean(errors.name)}>
							<FieldLabel htmlFor="user-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								disabled={isSubmitting}
								id="user-name"
								{...form.register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field data-invalid={Boolean(errors.email)}>
							<FieldLabel htmlFor="user-email">Email</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.email)}
								disabled={isSubmitting}
								id="user-email"
								{...form.register("email")}
							/>
							<FieldError errors={[errors.email]} />
						</Field>
						<Field data-invalid={Boolean(errors.image)}>
							<FieldLabel htmlFor="user-image">Imagen</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.image)}
								disabled={isSubmitting}
								id="user-image"
								placeholder="https://..."
								{...form.register("image")}
							/>
							<FieldError errors={[errors.image]} />
						</Field>
						<Field data-invalid={Boolean(errors.role)}>
							<FieldLabel htmlFor="user-role">Rol</FieldLabel>
							<Select id="user-role" {...form.register("role")}>
								{userRoleOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
							<FieldError errors={[errors.role]} />
						</Field>
					</FieldGroup>

					<FieldSet>
						<div className="flex items-center justify-between gap-3">
							<div className="flex flex-col gap-1">
								<FieldLegend>Direcciones</FieldLegend>
								<p className="text-muted-foreground text-xs/relaxed">
									Las nuevas se crean junto con el usuario. Las existentes que
									quites se envían a papelera al guardar.
								</p>
							</div>
							<Button
								disabled={isSubmitting}
								onClick={() => append({ ...emptyUserAddressFormValue })}
								type="button"
								variant="outline"
							>
								<PlusIcon data-icon="inline-start" />
								Agregar dirección
							</Button>
						</div>

						{fields.length === 0 ? (
							<div className="rounded-none border border-dashed p-4 text-muted-foreground text-xs/relaxed">
								Todavía no hay direcciones cargadas para este perfil.
							</div>
						) : (
							<div className="flex flex-col gap-4">
								{fields.map((field, index) => {
									const addressErrors = errors.addresses?.[index];
									const addressValue = watchedAddresses?.[index];

									return (
										<div
											className="flex flex-col gap-4 rounded-none border p-4"
											key={field.id}
										>
											<div className="flex items-center justify-between gap-3">
												<div className="flex flex-col gap-0.5">
													<span className="font-medium text-sm">
														Dirección {index + 1}
													</span>
													<span className="text-muted-foreground text-xs">
														{addressValue?.id
															? `ID ${addressValue.id}`
															: "Nueva dirección"}
													</span>
												</div>
												<Button
													disabled={isSubmitting}
													onClick={() => remove(index)}
													type="button"
													variant="outline"
												>
													<Trash2Icon data-icon="inline-start" />
													Quitar
												</Button>
											</div>

											<FieldGroup className="grid gap-4 md:grid-cols-2">
												<Field data-invalid={Boolean(addressErrors?.type)}>
													<FieldLabel htmlFor={`user-address-type-${index}`}>
														Tipo
													</FieldLabel>
													<Select
														id={`user-address-type-${index}`}
														{...form.register(
															`addresses.${index}.type` as const,
														)}
													>
														{addressTypeOptions.map((option) => (
															<option key={option.value} value={option.value}>
																{option.label}
															</option>
														))}
													</Select>
													<FieldError errors={[addressErrors?.type]} />
												</Field>
												<Field orientation="horizontal">
													<Switch
														checked={Boolean(addressValue?.active)}
														disabled={isSubmitting}
														onCheckedChange={(checked) =>
															form.setValue(
																`addresses.${index}.active`,
																checked,
																{
																	shouldDirty: true,
																	shouldValidate: true,
																},
															)
														}
													/>
													<FieldContent>
														<FieldLabel>Activa</FieldLabel>
														<FieldDescription>
															Se conserva pero puede quedar inactiva.
														</FieldDescription>
													</FieldContent>
												</Field>
												<Field
													className="md:col-span-2"
													data-invalid={Boolean(addressErrors?.line1)}
												>
													<FieldLabel htmlFor={`user-address-line1-${index}`}>
														Dirección
													</FieldLabel>
													<Input
														aria-invalid={Boolean(addressErrors?.line1)}
														disabled={isSubmitting}
														id={`user-address-line1-${index}`}
														{...form.register(
															`addresses.${index}.line1` as const,
														)}
													/>
													<FieldError errors={[addressErrors?.line1]} />
												</Field>
												<Field
													className="md:col-span-2"
													data-invalid={Boolean(addressErrors?.line2)}
												>
													<FieldLabel htmlFor={`user-address-line2-${index}`}>
														Complemento
													</FieldLabel>
													<Input
														aria-invalid={Boolean(addressErrors?.line2)}
														disabled={isSubmitting}
														id={`user-address-line2-${index}`}
														{...form.register(
															`addresses.${index}.line2` as const,
														)}
													/>
													<FieldError errors={[addressErrors?.line2]} />
												</Field>
												<Field data-invalid={Boolean(addressErrors?.city)}>
													<FieldLabel htmlFor={`user-address-city-${index}`}>
														Ciudad
													</FieldLabel>
													<Input
														aria-invalid={Boolean(addressErrors?.city)}
														disabled={isSubmitting}
														id={`user-address-city-${index}`}
														{...form.register(
															`addresses.${index}.city` as const,
														)}
													/>
													<FieldError errors={[addressErrors?.city]} />
												</Field>
												<Field data-invalid={Boolean(addressErrors?.state)}>
													<FieldLabel htmlFor={`user-address-state-${index}`}>
														Provincia / Estado
													</FieldLabel>
													<Input
														aria-invalid={Boolean(addressErrors?.state)}
														disabled={isSubmitting}
														id={`user-address-state-${index}`}
														{...form.register(
															`addresses.${index}.state` as const,
														)}
													/>
													<FieldError errors={[addressErrors?.state]} />
												</Field>
												<Field
													data-invalid={Boolean(addressErrors?.postalCode)}
												>
													<FieldLabel htmlFor={`user-address-postal-${index}`}>
														Código postal
													</FieldLabel>
													<Input
														aria-invalid={Boolean(addressErrors?.postalCode)}
														disabled={isSubmitting}
														id={`user-address-postal-${index}`}
														{...form.register(
															`addresses.${index}.postalCode` as const,
														)}
													/>
													<FieldError errors={[addressErrors?.postalCode]} />
												</Field>
												<Field data-invalid={Boolean(addressErrors?.country)}>
													<FieldLabel htmlFor={`user-address-country-${index}`}>
														País
													</FieldLabel>
													<Input
														aria-invalid={Boolean(addressErrors?.country)}
														disabled={isSubmitting}
														id={`user-address-country-${index}`}
														{...form.register(
															`addresses.${index}.country` as const,
														)}
													/>
													<FieldError errors={[addressErrors?.country]} />
												</Field>
											</FieldGroup>
										</div>
									);
								})}
							</div>
						)}
					</FieldSet>
				</form>
			)}
		</CrudFormDialogShell>
	);
}
