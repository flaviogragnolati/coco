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
import { Select } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { productClientTermsCreateInputSchema } from "~/schemas/admin/product-client-terms.schemas";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import type { ProductListItem } from "~/shared/common/admin-crud/product.types";
import type {
	ProductClientTermsDetail,
	ProductClientTermsFormInput,
	ProductClientTermsFormValues,
} from "~/shared/common/admin-crud/product-client-terms.types";
import {
	defaultProductClientTermsFormValues,
	productClientTermsDetailToFormValues,
} from "./product-client-terms.mappers";

const currencyOptions: ProductClientTermsFormValues["currency"][] = [
	"ARS",
	"USD",
	"EUR",
	"BRL",
];

export function ProductClientTermsFormDialog({
	open,
	mode,
	terms,
	products,
	isLoadingTerms,
	isLoadingProducts,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	terms?: ProductClientTermsDetail;
	products: ProductListItem[];
	isLoadingTerms?: boolean;
	isLoadingProducts?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: ProductClientTermsFormValues) => void;
}) {
	const form = useForm<
		ProductClientTermsFormInput,
		unknown,
		ProductClientTermsFormValues
	>({
		resolver: zodResolver(productClientTermsCreateInputSchema),
		defaultValues: defaultProductClientTermsFormValues,
	});

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const title =
		mode === "create"
			? "Agregar terminos de cliente"
			: "Editar terminos de cliente";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultProductClientTermsFormValues);
			return;
		}

		if (terms) {
			form.reset(productClientTermsDetailToFormValues(terms));
		}
	}, [form, mode, open, terms]);

	return (
		<CrudFormDialogShell
			description="Define precio, cantidades permitidas y vigencia comercial para ventas al cliente."
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
						disabled={isSubmitting || (mode === "edit" && isLoadingTerms)}
						form="product-client-terms-crud-form"
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
			{mode === "edit" && isLoadingTerms ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-28 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="product-client-terms-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[12rem_1fr]">
						<Field>
							<FieldLabel htmlFor="product-client-terms-id">ID</FieldLabel>
							<Input
								disabled
								id="product-client-terms-id"
								value={terms?.id ? String(terms.id) : "Automatico"}
							/>
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={active}
								disabled={isSubmitting || terms?.deleted}
								onCheckedChange={(checked) =>
									form.setValue("active", checked, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
							<FieldContent>
								<FieldLabel>Terminos activos</FieldLabel>
								<FieldDescription>
									{terms?.deleted ? (
										<CrudStatusBadge
											active={terms.active}
											deleted={terms.deleted}
										/>
									) : (
										"Disponibles para operaciones nuevas"
									)}
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>

					<Field data-invalid={Boolean(errors.productId)}>
						<FieldLabel htmlFor="product-client-terms-product">
							Producto
						</FieldLabel>
						<Select
							aria-invalid={Boolean(errors.productId)}
							disabled={isSubmitting || isLoadingProducts}
							id="product-client-terms-product"
							{...form.register("productId", { valueAsNumber: true })}
						>
							<option value={0}>Seleccionar producto</option>
							{products.map((product) => (
								<option
									disabled={product.deleted && product.id !== terms?.product.id}
									key={product.id}
									value={product.id}
								>
									{product.name}
									{product.deleted ? " (eliminado)" : ""}
								</option>
							))}
						</Select>
						<FieldError errors={[errors.productId]} />
					</Field>

					<FieldSet>
						<FieldLegend>Cantidades y precios</FieldLegend>
						<FieldGroup className="grid gap-4 md:grid-cols-3">
							<Field data-invalid={Boolean(errors.moq)}>
								<FieldLabel htmlFor="product-client-terms-moq">MOQ</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.moq)}
									disabled={isSubmitting}
									id="product-client-terms-moq"
									inputMode="decimal"
									{...form.register("moq")}
								/>
								<FieldError errors={[errors.moq]} />
							</Field>
							<Field data-invalid={Boolean(errors.moqPrice)}>
								<FieldLabel htmlFor="product-client-terms-moq-price">
									Precio MOQ
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.moqPrice)}
									disabled={isSubmitting}
									id="product-client-terms-moq-price"
									inputMode="decimal"
									{...form.register("moqPrice")}
								/>
								<FieldError errors={[errors.moqPrice]} />
							</Field>
							<Field data-invalid={Boolean(errors.currency)}>
								<FieldLabel htmlFor="product-client-terms-currency">
									Moneda
								</FieldLabel>
								<Select
									aria-invalid={Boolean(errors.currency)}
									disabled={isSubmitting}
									id="product-client-terms-currency"
									{...form.register("currency")}
								>
									{currencyOptions.map((currency) => (
										<option key={currency} value={currency}>
											{currency}
										</option>
									))}
								</Select>
								<FieldError errors={[errors.currency]} />
							</Field>
							<Field data-invalid={Boolean(errors.step)}>
								<FieldLabel htmlFor="product-client-terms-step">
									Step
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.step)}
									disabled={isSubmitting}
									id="product-client-terms-step"
									inputMode="decimal"
									{...form.register("step")}
								/>
								<FieldError errors={[errors.step]} />
							</Field>
							<Field data-invalid={Boolean(errors.stepPrice)}>
								<FieldLabel htmlFor="product-client-terms-step-price">
									Precio step
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.stepPrice)}
									disabled={isSubmitting}
									id="product-client-terms-step-price"
									inputMode="decimal"
									{...form.register("stepPrice")}
								/>
								<FieldError errors={[errors.stepPrice]} />
							</Field>
							<Field data-invalid={Boolean(errors.max)}>
								<FieldLabel htmlFor="product-client-terms-max">
									Maximo
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.max)}
									disabled={isSubmitting}
									id="product-client-terms-max"
									inputMode="decimal"
									{...form.register("max")}
								/>
								<FieldError errors={[errors.max]} />
							</Field>
							<Field data-invalid={Boolean(errors.refPrice)}>
								<FieldLabel htmlFor="product-client-terms-ref-price">
									Precio ref.
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.refPrice)}
									disabled={isSubmitting}
									id="product-client-terms-ref-price"
									inputMode="decimal"
									{...form.register("refPrice")}
								/>
								<FieldError errors={[errors.refPrice]} />
							</Field>
						</FieldGroup>
					</FieldSet>

					<FieldSet>
						<FieldLegend>Vigencia</FieldLegend>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field data-invalid={Boolean(errors.fromDate)}>
								<FieldLabel htmlFor="product-client-terms-from-date">
									Desde
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.fromDate)}
									disabled={isSubmitting}
									id="product-client-terms-from-date"
									type="datetime-local"
									{...form.register("fromDate")}
								/>
								<FieldError errors={[errors.fromDate]} />
							</Field>
							<Field data-invalid={Boolean(errors.toDate)}>
								<FieldLabel htmlFor="product-client-terms-to-date">
									Hasta
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.toDate)}
									disabled={isSubmitting}
									id="product-client-terms-to-date"
									type="datetime-local"
									{...form.register("toDate")}
								/>
								<FieldError errors={[errors.toDate]} />
							</Field>
						</FieldGroup>
					</FieldSet>
				</form>
			)}
		</CrudFormDialogShell>
	);
}
