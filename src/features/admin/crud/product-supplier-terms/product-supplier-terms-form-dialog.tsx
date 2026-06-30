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
import { OptionalHint } from "~/features/admin/crud/_components/optional-hint";
import { ProductCombobox } from "~/features/admin/crud/_components/product-combobox";
import { productSupplierTermsCreateInputSchema } from "~/schemas/admin/product-supplier-terms.schemas";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import type { ProductListItem } from "~/shared/common/admin-crud/product.types";
import type {
	ProductSupplierTermsDetail,
	ProductSupplierTermsFormInput,
	ProductSupplierTermsFormValues,
} from "~/shared/common/admin-crud/product-supplier-terms.types";
import type { SupplierListItem } from "~/shared/common/admin-crud/supplier.types";
import {
	defaultProductSupplierTermsFormValues,
	productSupplierTermsDetailToFormValues,
} from "./product-supplier-terms.mappers";

const currencyOptions: ProductSupplierTermsFormValues["currency"][] = [
	"ARS",
	"USD",
	"EUR",
	"BRL",
];

export function ProductSupplierTermsFormDialog({
	open,
	mode,
	terms,
	products,
	suppliers,
	isLoadingTerms,
	isLoadingProducts,
	isLoadingSuppliers,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	terms?: ProductSupplierTermsDetail;
	products: ProductListItem[];
	suppliers: SupplierListItem[];
	isLoadingTerms?: boolean;
	isLoadingProducts?: boolean;
	isLoadingSuppliers?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: ProductSupplierTermsFormValues) => void;
}) {
	const form = useForm<
		ProductSupplierTermsFormInput,
		unknown,
		ProductSupplierTermsFormValues
	>({
		resolver: zodResolver(productSupplierTermsCreateInputSchema),
		defaultValues: defaultProductSupplierTermsFormValues,
	});

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const title =
		mode === "create"
			? "Agregar terminos de proveedor"
			: "Editar terminos de proveedor";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultProductSupplierTermsFormValues);
			return;
		}

		if (terms) {
			form.reset(productSupplierTermsDetailToFormValues(terms));
		}
	}, [form, mode, open, terms]);

	return (
		<CrudFormDialogShell
			description="Define condiciones de compra por producto, proveedor y vigencia."
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
						form="product-supplier-terms-crud-form"
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
					id="product-supplier-terms-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[12rem_1fr]">
						<Field>
							<FieldLabel htmlFor="product-supplier-terms-id">ID</FieldLabel>
							<Input
								disabled
								id="product-supplier-terms-id"
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

					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field data-invalid={Boolean(errors.productId)}>
							<FieldLabel htmlFor="product-supplier-terms-product">
								Producto
							</FieldLabel>
							<ProductCombobox
								currentProductId={terms?.product.id}
								disabled={isSubmitting || isLoadingProducts}
								id="product-supplier-terms-product"
								invalid={Boolean(errors.productId)}
								onChange={(productId) =>
									form.setValue("productId", productId, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
								products={products}
								value={form.watch("productId")}
							/>
							<FieldError errors={[errors.productId]} />
						</Field>
						<Field data-invalid={Boolean(errors.supplierId)}>
							<FieldLabel htmlFor="product-supplier-terms-supplier">
								Proveedor
							</FieldLabel>
							<Select
								aria-invalid={Boolean(errors.supplierId)}
								disabled={isSubmitting || isLoadingSuppliers}
								id="product-supplier-terms-supplier"
								{...form.register("supplierId", { valueAsNumber: true })}
							>
								<option value={0}>Seleccionar proveedor</option>
								{suppliers.map((supplier) => (
									<option
										disabled={
											supplier.deleted && supplier.id !== terms?.supplier.id
										}
										key={supplier.id}
										value={supplier.id}
									>
										{supplier.name}
										{supplier.deleted ? " (eliminado)" : ""}
									</option>
								))}
							</Select>
							<FieldError errors={[errors.supplierId]} />
						</Field>
					</FieldGroup>

					<FieldSet>
						<FieldLegend>Cantidades y precios</FieldLegend>
						<FieldGroup className="grid gap-4 md:grid-cols-3">
							<Field data-invalid={Boolean(errors.moq)}>
								<FieldLabel htmlFor="product-supplier-terms-moq">
									MOQ
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.moq)}
									disabled={isSubmitting}
									id="product-supplier-terms-moq"
									inputMode="decimal"
									{...form.register("moq")}
								/>
								<FieldError errors={[errors.moq]} />
							</Field>
							<Field data-invalid={Boolean(errors.moqPrice)}>
								<FieldLabel htmlFor="product-supplier-terms-moq-price">
									Precio MOQ
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.moqPrice)}
									disabled={isSubmitting}
									id="product-supplier-terms-moq-price"
									inputMode="decimal"
									{...form.register("moqPrice")}
								/>
								<FieldError errors={[errors.moqPrice]} />
							</Field>
							<Field data-invalid={Boolean(errors.currency)}>
								<FieldLabel htmlFor="product-supplier-terms-currency">
									Moneda
								</FieldLabel>
								<Select
									aria-invalid={Boolean(errors.currency)}
									disabled={isSubmitting}
									id="product-supplier-terms-currency"
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
								<FieldLabel htmlFor="product-supplier-terms-step">
									Step <OptionalHint />
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.step)}
									disabled={isSubmitting}
									id="product-supplier-terms-step"
									inputMode="decimal"
									{...form.register("step")}
								/>
								<FieldError errors={[errors.step]} />
							</Field>
							<Field data-invalid={Boolean(errors.stepPrice)}>
								<FieldLabel htmlFor="product-supplier-terms-step-price">
									Precio step <OptionalHint />
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.stepPrice)}
									disabled={isSubmitting}
									id="product-supplier-terms-step-price"
									inputMode="decimal"
									{...form.register("stepPrice")}
								/>
								<FieldError errors={[errors.stepPrice]} />
							</Field>
							<Field data-invalid={Boolean(errors.max)}>
								<FieldLabel htmlFor="product-supplier-terms-max">
									Maximo <OptionalHint />
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.max)}
									disabled={isSubmitting}
									id="product-supplier-terms-max"
									inputMode="decimal"
									{...form.register("max")}
								/>
								<FieldError errors={[errors.max]} />
							</Field>
							<Field data-invalid={Boolean(errors.refPrice)}>
								<FieldLabel htmlFor="product-supplier-terms-ref-price">
									Precio ref. <OptionalHint />
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.refPrice)}
									disabled={isSubmitting}
									id="product-supplier-terms-ref-price"
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
								<FieldLabel htmlFor="product-supplier-terms-from-date">
									Desde
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.fromDate)}
									disabled={isSubmitting}
									id="product-supplier-terms-from-date"
									type="datetime-local"
									{...form.register("fromDate")}
								/>
								<FieldError errors={[errors.fromDate]} />
							</Field>
							<Field data-invalid={Boolean(errors.toDate)}>
								<FieldLabel htmlFor="product-supplier-terms-to-date">
									Hasta <OptionalHint />
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.toDate)}
									disabled={isSubmitting}
									id="product-supplier-terms-to-date"
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
