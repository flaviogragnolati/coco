"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

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
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { CrudStatusBadge } from "~/features/admin/crud/_components/crud-status-badge";
import { productCreateInputSchema } from "~/schemas/admin/product.schemas";
import type { BrandListItem } from "~/shared/common/admin-crud/brand.types";
import type { CrudModalMode } from "~/shared/common/admin-crud/crud.types";
import type {
	ProductBrandAssignment,
	ProductDetail,
	ProductFormInput,
	ProductFormValues,
	ProductUnit,
} from "~/shared/common/admin-crud/product.types";
import type { SupplierListItem } from "~/shared/common/admin-crud/supplier.types";
import {
	defaultProductFormValues,
	productDetailToFormValues,
} from "./product.mappers";

const productUnitOptions: Array<{ label: string; value: ProductUnit }> = [
	{ label: "Unidad", value: "piece" },
	{ label: "Caja", value: "box" },
	{ label: "Kilogramo", value: "kg" },
	{ label: "Gramo", value: "gr" },
	{ label: "Libra", value: "lb" },
	{ label: "Otro", value: "other" },
];

type InlineBrandValues = Extract<
	ProductFormValues["brandAssignment"],
	{ mode: "new" }
>["brand"];

const defaultInlineBrand: InlineBrandValues = {
	name: "",
	description: "",
	logoUrl: "",
	active: true,
};

function toInlineBrandValues(
	value: Partial<InlineBrandValues> | InlineBrandValues,
): InlineBrandValues {
	return {
		name: value.name ?? "",
		description: value.description ?? "",
		logoUrl: value.logoUrl ?? "",
		active: value.active ?? true,
	};
}

type BrandAssignmentErrors = {
	brandId?: { message?: string };
	brand?: {
		name?: { message?: string };
		description?: { message?: string };
		logoUrl?: { message?: string };
	};
};

export function ProductFormDialog({
	open,
	mode,
	product,
	brands,
	suppliers,
	isLoadingProduct,
	isSubmitting,
	isLoadingBrands,
	isLoadingSuppliers,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	mode: CrudModalMode;
	product?: ProductDetail;
	brands: BrandListItem[];
	suppliers: SupplierListItem[];
	isLoadingProduct?: boolean;
	isSubmitting?: boolean;
	isLoadingBrands?: boolean;
	isLoadingSuppliers?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: ProductFormValues) => void;
}) {
	const form = useForm<ProductFormInput, unknown, ProductFormValues>({
		resolver: zodResolver(productCreateInputSchema),
		defaultValues: defaultProductFormValues,
	});

	const errors = form.formState.errors;
	const brandAssignment = form.watch("brandAssignment");
	const active = Boolean(form.watch("active"));
	const brandAssignmentErrors = errors.brandAssignment as
		| BrandAssignmentErrors
		| undefined;
	const inlineBrand =
		brandAssignment.mode === "new" ? brandAssignment.brand : defaultInlineBrand;
	const title = mode === "create" ? "Agregar producto" : "Editar producto";

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			form.reset(defaultProductFormValues);
			return;
		}

		if (product) {
			form.reset(productDetailToFormValues(product));
		}
	}, [form, mode, open, product]);

	const setBrandAssignment = (nextValue: ProductBrandAssignment) => {
		form.setValue("brandAssignment", nextValue, {
			shouldDirty: true,
			shouldValidate: true,
		});
	};

	const handleBrandModeChange = (nextMode: ProductBrandAssignment["mode"]) => {
		if (nextMode === "none") {
			setBrandAssignment({ mode: "none" });
			return;
		}

		if (nextMode === "existing") {
			const nextBrandId =
				brandAssignment.mode === "existing"
					? brandAssignment.brandId
					: brands[0]?.id;

			if (!nextBrandId) return;

			setBrandAssignment({
				mode: "existing",
				brandId: nextBrandId,
			});
			return;
		}

		setBrandAssignment({
			mode: "new",
			brand:
				brandAssignment.mode === "new"
					? toInlineBrandValues(brandAssignment.brand)
					: defaultInlineBrand,
		});
	};

	const updateInlineBrand = (patch: Partial<InlineBrandValues>) => {
		if (brandAssignment.mode !== "new") return;

		setBrandAssignment({
			mode: "new",
			brand: toInlineBrandValues({
				...brandAssignment.brand,
				...patch,
			}),
		});
	};

	return (
		<CrudFormDialogShell
			description="El producto puede quedar sin marca o relacionarse con una existente. Si creás una nueva marca desde acá, se registra en la misma transacción."
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
						disabled={isSubmitting || (mode === "edit" && isLoadingProduct)}
						form="product-crud-form"
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
			{mode === "edit" && isLoadingProduct ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-28 w-full" />
					<Skeleton className="h-28 w-full" />
				</div>
			) : (
				<form
					className="flex flex-col gap-5"
					id="product-crud-form"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-[12rem_1fr]">
						<Field>
							<FieldLabel htmlFor="product-id">ID</FieldLabel>
							<Input
								disabled
								id="product-id"
								value={product?.id ? String(product.id) : "Automático"}
							/>
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={active}
								disabled={isSubmitting || product?.deleted}
								onCheckedChange={(checked) =>
									form.setValue("active", checked, {
										shouldDirty: true,
										shouldValidate: true,
									})
								}
							/>
							<FieldContent>
								<FieldLabel>Producto activo</FieldLabel>
								<FieldDescription>
									{product?.deleted ? (
										<CrudStatusBadge
											active={product.active}
											deleted={product.deleted}
										/>
									) : (
										"Disponible para operaciones nuevas"
									)}
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>

					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field data-invalid={Boolean(errors.name)}>
							<FieldLabel htmlFor="product-name">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.name)}
								disabled={isSubmitting}
								id="product-name"
								{...form.register("name")}
							/>
							<FieldError errors={[errors.name]} />
						</Field>
						<Field data-invalid={Boolean(errors.unit)}>
							<FieldLabel htmlFor="product-unit">Unidad</FieldLabel>
							<Select id="product-unit" {...form.register("unit")}>
								{productUnitOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
							<FieldError errors={[errors.unit]} />
						</Field>
						<Field data-invalid={Boolean(errors.defaultSupplierId)}>
							<FieldLabel htmlFor="product-default-supplier">
								Proveedor por defecto
							</FieldLabel>
							<Select
								aria-invalid={Boolean(errors.defaultSupplierId)}
								disabled={isSubmitting || isLoadingSuppliers}
								id="product-default-supplier"
								{...form.register("defaultSupplierId", {
									setValueAs: (value) => (value ? Number(value) : undefined),
								})}
							>
								<option value="">Sin proveedor por defecto</option>
								{suppliers.map((supplier) => (
									<option key={supplier.id} value={supplier.id}>
										{supplier.name}
										{supplier.deleted ? " (eliminado)" : ""}
									</option>
								))}
							</Select>
							<FieldDescription>
								{isLoadingSuppliers
									? "Cargando proveedores..."
									: "Opcional. Se usa como sugerencia operativa inicial."}
							</FieldDescription>
							<FieldError errors={[errors.defaultSupplierId]} />
						</Field>
						<Field data-invalid={Boolean(errors.description)}>
							<FieldLabel htmlFor="product-description">Descripción</FieldLabel>
							<Textarea
								aria-invalid={Boolean(errors.description)}
								disabled={isSubmitting}
								id="product-description"
								{...form.register("description")}
							/>
							<FieldError errors={[errors.description]} />
						</Field>
					</FieldGroup>

					<FieldSet>
						<FieldLegend>Marca</FieldLegend>
						<FieldGroup>
							<Field>
								<FieldLabel>Asignación</FieldLabel>
								<ToggleGroup
									onValueChange={(value) => {
										if (value) {
											handleBrandModeChange(
												value as ProductBrandAssignment["mode"],
											);
										}
									}}
									type="single"
									value={brandAssignment.mode}
									variant="outline"
								>
									<ToggleGroupItem value="none">Sin marca</ToggleGroupItem>
									<ToggleGroupItem
										disabled={brands.length === 0}
										value="existing"
									>
										Usar existente
									</ToggleGroupItem>
									<ToggleGroupItem value="new">Crear nueva</ToggleGroupItem>
								</ToggleGroup>
								<FieldDescription>
									La edición de una marca existente se hace desde el CRUD de
									marcas.
								</FieldDescription>
							</Field>

							{brandAssignment.mode === "existing" ? (
								<Field data-invalid={Boolean(brandAssignmentErrors?.brandId)}>
									<FieldLabel htmlFor="product-brand-id">
										Marca existente
									</FieldLabel>
									<Select
										aria-invalid={Boolean(brandAssignmentErrors?.brandId)}
										disabled={isSubmitting || isLoadingBrands}
										id="product-brand-id"
										onChange={(event) => {
											const nextBrandId = Number(event.target.value);
											if (!Number.isNaN(nextBrandId)) {
												setBrandAssignment({
													mode: "existing",
													brandId: nextBrandId,
												});
											}
										}}
										value={String(brandAssignment.brandId ?? "")}
									>
										<option value="">Seleccioná una marca</option>
										{brands.map((brand) => (
											<option key={brand.id} value={brand.id}>
												{brand.name}
												{brand.deleted ? " (eliminada)" : ""}
											</option>
										))}
									</Select>
									<FieldDescription>
										{isLoadingBrands
											? "Cargando marcas..."
											: "Se conserva la marca actual hasta que la cambies."}
									</FieldDescription>
									<FieldError errors={[brandAssignmentErrors?.brandId]} />
								</Field>
							) : null}

							{brandAssignment.mode === "new" ? (
								<FieldSet>
									<FieldLegend variant="label">Nueva marca</FieldLegend>
									<FieldGroup className="grid gap-4 md:grid-cols-2">
										<Field
											data-invalid={Boolean(brandAssignmentErrors?.brand?.name)}
										>
											<FieldLabel htmlFor="product-inline-brand-name">
												Nombre
											</FieldLabel>
											<Input
												aria-invalid={Boolean(
													brandAssignmentErrors?.brand?.name,
												)}
												disabled={isSubmitting}
												id="product-inline-brand-name"
												onChange={(event) =>
													updateInlineBrand({ name: event.target.value })
												}
												value={inlineBrand.name}
											/>
											<FieldError
												errors={[brandAssignmentErrors?.brand?.name]}
											/>
										</Field>
										<Field
											data-invalid={Boolean(
												brandAssignmentErrors?.brand?.logoUrl,
											)}
										>
											<FieldLabel htmlFor="product-inline-brand-logo">
												Logo URL
											</FieldLabel>
											<Input
												aria-invalid={Boolean(
													brandAssignmentErrors?.brand?.logoUrl,
												)}
												disabled={isSubmitting}
												id="product-inline-brand-logo"
												onChange={(event) =>
													updateInlineBrand({ logoUrl: event.target.value })
												}
												placeholder="https://..."
												value={inlineBrand.logoUrl}
											/>
											<FieldError
												errors={[brandAssignmentErrors?.brand?.logoUrl]}
											/>
										</Field>
										<Field
											className="md:col-span-2"
											data-invalid={Boolean(
												brandAssignmentErrors?.brand?.description,
											)}
										>
											<FieldLabel htmlFor="product-inline-brand-description">
												Descripción
											</FieldLabel>
											<Textarea
												aria-invalid={Boolean(
													brandAssignmentErrors?.brand?.description,
												)}
												disabled={isSubmitting}
												id="product-inline-brand-description"
												onChange={(event) =>
													updateInlineBrand({ description: event.target.value })
												}
												value={inlineBrand.description}
											/>
											<FieldError
												errors={[brandAssignmentErrors?.brand?.description]}
											/>
										</Field>
										<Field orientation="horizontal">
											<Switch
												checked={inlineBrand.active}
												disabled={isSubmitting}
												onCheckedChange={(checked) =>
													updateInlineBrand({ active: checked })
												}
											/>
											<FieldContent>
												<FieldLabel>Marca activa</FieldLabel>
												<FieldDescription>
													Se crea junto con el producto.
												</FieldDescription>
											</FieldContent>
										</Field>
									</FieldGroup>
								</FieldSet>
							) : null}
						</FieldGroup>
					</FieldSet>

					<FieldSet>
						<FieldLegend>Imágenes</FieldLegend>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field data-invalid={Boolean(errors.cartImageUrl)}>
								<FieldLabel htmlFor="product-cart-image">
									Imagen para carrito
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.cartImageUrl)}
									disabled={isSubmitting}
									id="product-cart-image"
									placeholder="https://..."
									{...form.register("cartImageUrl")}
								/>
								<FieldError errors={[errors.cartImageUrl]} />
							</Field>
							<Field data-invalid={Boolean(errors.cardImageUrl)}>
								<FieldLabel htmlFor="product-card-image">
									Imagen para cards
								</FieldLabel>
								<Input
									aria-invalid={Boolean(errors.cardImageUrl)}
									disabled={isSubmitting}
									id="product-card-image"
									placeholder="https://..."
									{...form.register("cardImageUrl")}
								/>
								<FieldError errors={[errors.cardImageUrl]} />
							</Field>
							<Field
								className="md:col-span-2"
								data-invalid={Boolean(errors.images)}
							>
								<FieldLabel htmlFor="product-images">Galería</FieldLabel>
								<Controller
									control={form.control}
									name="images"
									render={({ field }) => (
										<Textarea
											aria-invalid={Boolean(errors.images)}
											disabled={isSubmitting}
											id="product-images"
											onChange={(event) => {
												field.onChange(
													event.target.value
														.split(/\n+/)
														.map((line) => line.trim())
														.filter(Boolean),
												);
											}}
											placeholder="Una URL por línea"
											value={(field.value ?? []).join("\n")}
										/>
									)}
								/>
								<FieldDescription>
									Cargá una URL por línea para la galería secundaria.
								</FieldDescription>
								<FieldError errors={[errors.images]} />
							</Field>
						</FieldGroup>
					</FieldSet>
				</form>
			)}
		</CrudFormDialogShell>
	);
}
