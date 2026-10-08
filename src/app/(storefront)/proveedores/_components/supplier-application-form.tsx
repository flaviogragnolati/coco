"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon, SendIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
	SUPPLIER_APPLICATION_LIMITS,
	supplierApplicationSubmitInputSchema,
} from "~/schemas/supplier-application.schemas";
import type {
	SupplierApplicationFormInput,
	SupplierApplicationSubmitInput,
} from "~/shared/common/supplier-application.types";
import { api } from "~/trpc/react";

const defaultValues: SupplierApplicationFormInput = {
	contactName: "",
	companyName: "",
	email: "",
	phone: "",
	offering: "",
	website: "",
};

export function SupplierApplicationForm() {
	const [submitted, setSubmitted] = useState(false);
	const form = useForm<
		SupplierApplicationFormInput,
		unknown,
		SupplierApplicationSubmitInput
	>({
		resolver: zodResolver(supplierApplicationSubmitInputSchema),
		defaultValues,
	});
	const errors = form.formState.errors;

	const submitMutation = api.supplierApplication.submit.useMutation({
		onSuccess: () => setSubmitted(true),
	});
	const isSubmitting = submitMutation.isPending;

	if (submitted) {
		return (
			<Card>
				<CardContent className="flex flex-col items-start gap-4" role="status">
					<CheckCircle2Icon
						aria-hidden="true"
						className="size-8 text-primary"
					/>
					<div className="flex flex-col gap-1">
						<h2 className="font-heading font-semibold text-xl">
							¡Gracias! Recibimos tu solicitud
						</h2>
						<p className="text-muted-foreground text-sm/relaxed">
							Vamos a revisarla y te contactamos por el email o el teléfono que
							nos dejaste.
						</p>
					</div>
					<Button asChild variant="outline">
						<Link href="/">Volver al inicio</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Contanos sobre tu empresa</CardTitle>
				<CardDescription>
					Dejanos al menos un email o un teléfono para contactarte.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					className="flex flex-col gap-5"
					noValidate
					onSubmit={form.handleSubmit((values) =>
						submitMutation.mutate(values),
					)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field data-invalid={Boolean(errors.contactName)}>
							<FieldLabel htmlFor="supplier-application-contact-name">
								Tu nombre
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.contactName)}
								autoComplete="name"
								disabled={isSubmitting}
								id="supplier-application-contact-name"
								maxLength={SUPPLIER_APPLICATION_LIMITS.contactName}
								{...form.register("contactName")}
							/>
							<FieldError errors={[errors.contactName]} />
						</Field>
						<Field data-invalid={Boolean(errors.companyName)}>
							<FieldLabel htmlFor="supplier-application-company-name">
								Empresa
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.companyName)}
								autoComplete="organization"
								disabled={isSubmitting}
								id="supplier-application-company-name"
								maxLength={SUPPLIER_APPLICATION_LIMITS.companyName}
								{...form.register("companyName")}
							/>
							<FieldError errors={[errors.companyName]} />
						</Field>
						<Field data-invalid={Boolean(errors.email)}>
							<FieldLabel htmlFor="supplier-application-email">
								Email
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.email)}
								autoComplete="email"
								disabled={isSubmitting}
								id="supplier-application-email"
								inputMode="email"
								maxLength={SUPPLIER_APPLICATION_LIMITS.email}
								type="email"
								{...form.register("email")}
							/>
							<FieldError errors={[errors.email]} />
						</Field>
						<Field data-invalid={Boolean(errors.phone)}>
							<FieldLabel htmlFor="supplier-application-phone">
								Teléfono
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.phone)}
								autoComplete="tel"
								disabled={isSubmitting}
								id="supplier-application-phone"
								inputMode="tel"
								maxLength={SUPPLIER_APPLICATION_LIMITS.phone}
								type="tel"
								{...form.register("phone")}
							/>
							<FieldError errors={[errors.phone]} />
						</Field>
						<Field
							className="md:col-span-2"
							data-invalid={Boolean(errors.offering)}
						>
							<FieldLabel htmlFor="supplier-application-offering">
								¿Qué ofrecés?
							</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.offering)}
								disabled={isSubmitting}
								id="supplier-application-offering"
								maxLength={SUPPLIER_APPLICATION_LIMITS.offering}
								rows={5}
								{...form.register("offering")}
							/>
							<FieldDescription>
								Qué productos vendés, en qué presentaciones y desde dónde
								despachás.
							</FieldDescription>
							<FieldError errors={[errors.offering]} />
						</Field>
					</FieldGroup>

					<div aria-hidden="true" className="sr-only">
						<label htmlFor="supplier-application-website">
							No completar este campo
						</label>
						<input
							autoComplete="off"
							id="supplier-application-website"
							tabIndex={-1}
							type="text"
							{...form.register("website")}
						/>
					</div>

					{submitMutation.isError ? (
						<p className="text-destructive text-sm" role="alert">
							No pudimos enviar tu solicitud. Probá de nuevo en unos minutos.
						</p>
					) : null}

					<div className="flex justify-end">
						<Button disabled={isSubmitting} type="submit">
							<SendIcon data-icon="inline-start" />
							{isSubmitting ? "Enviando..." : "Enviar solicitud"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
