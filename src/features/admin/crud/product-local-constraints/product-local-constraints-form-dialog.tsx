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
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { ProductCombobox } from "~/features/admin/crud/_components/product-combobox";
import { productLocalConstraintsCreateInputSchema } from "~/schemas/admin/product-local-constraints.schemas";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import type { ProductListItem } from "~/shared/common/admin-crud/product.types";
import type {
	ProductLocalConstraintsDetail,
	ProductLocalConstraintsFormInput,
	ProductLocalConstraintsFormValues,
	ProductLocalConstraintType,
} from "~/shared/common/admin-crud/product-local-constraints.types";
import {
	defaultProductLocalConstraintsFormValues,
	productLocalConstraintsDetailToFormValues,
} from "./product-local-constraints.mappers";

const constraintTypeOptions: Array<{
	label: string;
	value: ProductLocalConstraintType;
}> = [
	{ label: "Maximo por cantidad", value: "max_quantity" },
	{ label: "Destino restringido", value: "restricted_destination" },
	{ label: "Requiere entrega interna", value: "requires_internal_delivery" },
	{ label: "Stock minimo", value: "minimum_stock" },
	{ label: "Restriccion legal", value: "legal_restriction" },
	{ label: "Disponibilidad estacional", value: "seasonal_availability" },
];

export function ProductLocalConstraintsFormDialog({
	open,
	mode,
	constraint,
	products,
	isLoadingConstraint,
	isLoadingProducts,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	constraint?: ProductLocalConstraintsDetail;
	products: ProductListItem[];
	isLoadingConstraint?: boolean;
	isLoadingProducts?: boolean;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: ProductLocalConstraintsFormValues) => void;
}) {
	const form = useForm<
		ProductLocalConstraintsFormInput,
		unknown,
		ProductLocalConstraintsFormValues
	>({
		resolver: zodResolver(productLocalConstraintsCreateInputSchema),
		defaultValues: defaultProductLocalConstraintsFormValues,
	});

	const errors = form.formState.errors;
	const active = Boolean(form.watch("active"));
	const title =
		mode === "create"
			? "Agregar restriccion local"
			: "Editar restriccion local";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultProductLocalConstraintsFormValues);
			return;
		}

		if (constraint) {
			form.reset(productLocalConstraintsDetailToFormValues(constraint));
		}
	}, [constraint, form, mode, open]);

	return (
		<CrudFormDialogShell
			description="Configura restricciones locales por producto. Los campos value y scope aceptan JSON valido."
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
						disabled={isSubmitting || (mode === "edit" && isLoadingConstraint)}
						form="product-local-constraints-crud-form"
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
			{mode === "edit" && isLoadingConstraint ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-28 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="product-local-constraints-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[12rem_1fr]">
						<Field>
							<FieldLabel htmlFor="product-local-constraints-id">ID</FieldLabel>
							<Input
								disabled
								id="product-local-constraints-id"
								value={constraint?.id ? String(constraint.id) : "Automatico"}
							/>
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={active}
								disabled={isSubmitting || constraint?.deleted}
								onCheckedChange={(checked) =>
									form.setValue("active", checked, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
							<FieldContent>
								<FieldLabel>Restriccion activa</FieldLabel>
								<FieldDescription>
									{constraint?.deleted ? (
										<CrudStatusBadge
											active={constraint.active}
											deleted={constraint.deleted}
										/>
									) : (
										"Disponible para validaciones nuevas"
									)}
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>

					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field data-invalid={Boolean(errors.productId)}>
							<FieldLabel htmlFor="product-local-constraints-product">
								Producto
							</FieldLabel>
							<ProductCombobox
								currentProductId={constraint?.product.id}
								disabled={isSubmitting || isLoadingProducts}
								id="product-local-constraints-product"
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
						<Field data-invalid={Boolean(errors.constraintType)}>
							<FieldLabel htmlFor="product-local-constraints-type">
								Tipo
							</FieldLabel>
							<Select
								aria-invalid={Boolean(errors.constraintType)}
								disabled={isSubmitting}
								id="product-local-constraints-type"
								{...form.register("constraintType")}
							>
								<option value="">Sin tipo</option>
								{constraintTypeOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
							<FieldError errors={[errors.constraintType]} />
						</Field>
					</FieldGroup>

					<Field data-invalid={Boolean(errors.reason)}>
						<FieldLabel htmlFor="product-local-constraints-reason">
							Motivo
						</FieldLabel>
						<Textarea
							aria-invalid={Boolean(errors.reason)}
							disabled={isSubmitting}
							id="product-local-constraints-reason"
							{...form.register("reason")}
						/>
						<FieldError errors={[errors.reason]} />
					</Field>

					<FieldSet>
						<FieldLegend>JSON</FieldLegend>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field data-invalid={Boolean(errors.value)}>
								<FieldLabel htmlFor="product-local-constraints-value">
									Value
								</FieldLabel>
								<Textarea
									aria-invalid={Boolean(errors.value)}
									className="min-h-32 font-mono"
									disabled={isSubmitting}
									id="product-local-constraints-value"
									placeholder='{"max": 10}'
									{...form.register("value")}
								/>
								<FieldError errors={[errors.value]} />
							</Field>
							<Field data-invalid={Boolean(errors.scope)}>
								<FieldLabel htmlFor="product-local-constraints-scope">
									Scope
								</FieldLabel>
								<Textarea
									aria-invalid={Boolean(errors.scope)}
									className="min-h-32 font-mono"
									disabled={isSubmitting}
									id="product-local-constraints-scope"
									placeholder='{"destinationIds": [1]}'
									{...form.register("scope")}
								/>
								<FieldError errors={[errors.scope]} />
							</Field>
						</FieldGroup>
					</FieldSet>

					<FieldSet>
						<FieldLegend>Vigencia</FieldLegend>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field data-invalid={Boolean(errors.fromDate)}>
								<FieldLabel htmlFor="product-local-constraints-from-date">
									Desde
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.fromDate)}
									disabled={isSubmitting}
									id="product-local-constraints-from-date"
									type="datetime-local"
									{...form.register("fromDate")}
								/>
								<FieldError errors={[errors.fromDate]} />
							</Field>
							<Field data-invalid={Boolean(errors.toDate)}>
								<FieldLabel htmlFor="product-local-constraints-to-date">
									Hasta
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.toDate)}
									disabled={isSubmitting}
									id="product-local-constraints-to-date"
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
