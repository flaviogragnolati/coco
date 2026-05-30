"use client";

import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import type { Profile } from "~/schemas/profile.schemas";
import { api } from "~/trpc/react";

type ProfileFormProps = {
	profile: Omit<Profile, "dob"> & {
		dob: Date | string | null;
	};
};

type ProfileFormState = {
	name: string;
	document: string;
	taxId: string;
	dob: string;
};

function toDateInputValue(value: Date | string | null) {
	if (!value) return "";

	const date = typeof value === "string" ? new Date(value) : value;
	return date.toISOString().slice(0, 10);
}

function toFormState(profile: ProfileFormProps["profile"]): ProfileFormState {
	return {
		name: profile.name,
		document: profile.document ?? "",
		taxId: profile.taxId ?? "",
		dob: toDateInputValue(profile.dob),
	};
}

export function ProfileForm({ profile }: ProfileFormProps) {
	const router = useRouter();
	const [form, setForm] = useState<ProfileFormState>(() =>
		toFormState(profile),
	);

	const updateProfile = api.profile.update.useMutation({
		onSuccess(updatedProfile) {
			setForm(toFormState(updatedProfile));
			toast.success("Perfil actualizado");
			router.refresh();
		},
		onError(error) {
			toast.error(error.message || "No se pudo actualizar el perfil");
		},
	});

	const handleChange =
		(field: keyof ProfileFormState) =>
		(event: ChangeEvent<HTMLInputElement>) => {
			setForm((current) => ({
				...current,
				[field]: event.target.value,
			}));
		};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		updateProfile.mutate({
			name: form.name,
			document: form.document,
			taxId: form.taxId,
			dob: form.dob || null,
		});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Datos del usuario</CardTitle>
				<CardDescription>
					El email se toma de la cuenta de autenticacion y no se edita en esta
					version.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="flex flex-col gap-5" onSubmit={handleSubmit}>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="profile-name">Nombre</FieldLabel>
							<Input
								id="profile-name"
								onChange={handleChange("name")}
								required
								value={form.name}
							/>
						</Field>

						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="profile-email">Email</FieldLabel>
								<Input
									disabled
									id="profile-email"
									readOnly
									value={profile.email}
								/>
								<FieldDescription>
									Para cambiar el email se agregara verificacion en una version
									futura.
								</FieldDescription>
							</Field>
							<Field>
								<FieldLabel htmlFor="profile-role">Rol</FieldLabel>
								<div className="flex h-8 items-center">
									<Badge id="profile-role" variant="secondary">
										{profile.role}
									</Badge>
								</div>
							</Field>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="profile-document">Documento</FieldLabel>
								<Input
									id="profile-document"
									onChange={handleChange("document")}
									value={form.document}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="profile-tax-id">Tax ID</FieldLabel>
								<Input
									id="profile-tax-id"
									onChange={handleChange("taxId")}
									value={form.taxId}
								/>
							</Field>
						</div>

						<Field>
							<FieldLabel htmlFor="profile-dob">Fecha de nacimiento</FieldLabel>
							<Input
								id="profile-dob"
								onChange={handleChange("dob")}
								type="date"
								value={form.dob}
							/>
						</Field>
					</FieldGroup>

					<div className="flex justify-end">
						<Button disabled={updateProfile.isPending} type="submit">
							<SaveIcon data-icon="inline-start" />
							{updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
