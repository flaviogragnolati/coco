"use client";

import { PlusIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { CrudDeleteDialog } from "~/features/admin/crud/_components/crud-delete-dialog";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudEmptyState,
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { CrudStatsCards } from "~/features/admin/crud/_components/crud-stats-cards";
import {
	matchesCrudStatus,
	matchesSearch,
	normalizeSearch,
} from "~/features/admin/crud/_lib/filter-helpers";
import { ProductFormDialog } from "~/features/admin/crud/product/product-form-dialog";
import { ProductPreviewDialog } from "~/features/admin/crud/product/product-preview-dialog";
import { ProductTable } from "~/features/admin/crud/product/product-table";
import type {
	CrudModalState,
	CrudStatusFilter,
} from "~/shared/common/admin-crud/crud.types";
import type {
	ProductFormValues,
	ProductListItem,
} from "~/shared/common/admin-crud/product.types";
import { api } from "~/trpc/react";

const closedFormState: CrudModalState<number> = {
	open: false,
	mode: null,
	entityId: null,
};

export function ProductCrudClient() {
	const utils = api.useUtils();
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [statusFilter, setStatusFilter] = useState<CrudStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [formState, setFormState] =
		useState<CrudModalState<number>>(closedFormState);
	const [softDeleteTarget, setSoftDeleteTarget] =
		useState<ProductListItem | null>(null);
	const [hardDeleteTarget, setHardDeleteTarget] =
		useState<ProductListItem | null>(null);
	const [previewProductId, setPreviewProductId] = useState<number | null>(null);

	const selectedProductId =
		formState.open && formState.mode === "edit" ? formState.entityId : null;
	const formMode = formState.mode ?? "create";

	const productsQuery = api.admin.product.list.useQuery({ includeDeleted });
	const statsQuery = api.admin.product.getStats.useQuery();
	const brandsQuery = api.admin.brand.list.useQuery({ includeDeleted: true });
	const suppliersQuery = api.admin.supplier.list.useQuery({
		includeDeleted: true,
	});
	const productDetailQuery = api.admin.product.getById.useQuery(
		{ id: selectedProductId ?? 0 },
		{ enabled: selectedProductId !== null },
	);
	const productPreviewQuery = api.admin.product.getPreview.useQuery(
		{ id: previewProductId ?? 0 },
		{ enabled: previewProductId !== null },
	);

	const invalidateProductQueries = async () => {
		await Promise.all([
			utils.admin.product.list.invalidate(),
			utils.admin.product.getStats.invalidate(),
			utils.admin.product.getById.invalidate(),
			utils.admin.product.getPreview.invalidate(),
			utils.admin.brand.list.invalidate(),
			utils.admin.brand.getStats.invalidate(),
		]);
	};

	const createMutation = api.admin.product.create.useMutation({
		onSuccess: async () => {
			toast.success("Producto creado");
			setFormState(closedFormState);
			await invalidateProductQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el producto");
		},
	});

	const updateMutation = api.admin.product.update.useMutation({
		onSuccess: async () => {
			toast.success("Producto actualizado");
			setFormState(closedFormState);
			await invalidateProductQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el producto");
		},
	});

	const softDeleteMutation = api.admin.product.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Producto enviado a papelera");
			setSoftDeleteTarget(null);
			await invalidateProductQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el producto");
		},
	});

	const hardDeleteMutation = api.admin.product.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Producto eliminado definitivamente");
			setHardDeleteTarget(null);
			await invalidateProductQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	useEffect(() => {
		if (
			formState.open &&
			formState.mode === "edit" &&
			productDetailQuery.isError
		) {
			toast.error(
				productDetailQuery.error.message || "No se pudo cargar el producto",
			);
			setFormState(closedFormState);
		}
	}, [
		formState.mode,
		formState.open,
		productDetailQuery.error,
		productDetailQuery.isError,
	]);

	const filteredProducts = useMemo(() => {
		const search = normalizeSearch(searchTerm);

		return (productsQuery.data ?? []).filter((product) => {
			return (
				matchesCrudStatus(statusFilter, product) &&
				matchesSearch(search, [
					product.id,
					product.name,
					product.description,
					product.brand?.name ?? null,
					product.defaultSupplier?.name ?? null,
				])
			);
		});
	}, [productsQuery.data, searchTerm, statusFilter]);

	const stats = statsQuery.data;
	const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (values: ProductFormValues) => {
		if (formState.mode === "edit" && formState.entityId !== null) {
			updateMutation.mutate({
				id: formState.entityId,
				...values,
			});
			return;
		}

		createMutation.mutate(values);
	};

	const renderTable = () => {
		if (productsQuery.isLoading) return <CrudLoadingState />;

		if (productsQuery.isError) {
			return (
				<CrudErrorState
					message={
						productsQuery.error.message ||
						"No se pudo obtener la lista de productos"
					}
				/>
			);
		}

		if (filteredProducts.length === 0) {
			return (
				<CrudEmptyState
					description="Ajustá los filtros o agregá un producto nuevo."
					title="No hay productos para mostrar"
				/>
			);
		}

		return (
			<ProductTable
				onEdit={(product) =>
					setFormState({
						open: true,
						mode: "edit",
						entityId: product.id,
					})
				}
				onHardDelete={setHardDeleteTarget}
				onPreview={(product) => setPreviewProductId(product.id)}
				onSoftDelete={setSoftDeleteTarget}
				products={filteredProducts}
			/>
		);
	};

	return (
		<CrudPageShell
			actions={
				<Button
					onClick={() =>
						setFormState({ open: true, mode: "create", entityId: null })
					}
				>
					<PlusIcon data-icon="inline-start" />
					Agregar nuevo
				</Button>
			}
			description="Administración de catálogo, imágenes, unidad comercial y relación opcional con marca y proveedor por defecto."
			title="Productos"
		>
			{statsQuery.isLoading ? (
				<CrudLoadingState rows={2} />
			) : statsQuery.isError ? (
				<CrudErrorState
					message={
						statsQuery.error.message || "No se pudieron cargar los indicadores"
					}
				/>
			) : stats ? (
				<CrudStatsCards
					stats={[
						{
							label: "Total",
							value: stats.total,
							description: "Incluye productos eliminados",
						},
						{
							label: "Activos",
							value: stats.active,
							description: "Disponibles para operaciones nuevas",
						},
						{
							label: "Inactivos",
							value: stats.inactive,
							description: "No eliminados, pero fuera de uso",
						},
						{
							label: "Eliminados",
							value: stats.deleted,
							description: "Baja lógica aplicada",
						},
					]}
				/>
			) : null}

			<section className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 rounded-none border p-3 lg:flex-row lg:items-end lg:justify-between">
					<FieldGroup className="grid flex-1 gap-3 md:grid-cols-[minmax(14rem,1fr)_auto_auto] md:items-end">
						<Field>
							<FieldLabel htmlFor="product-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="product-search"
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="ID, nombre, marca o proveedor"
									value={searchTerm}
								/>
							</div>
						</Field>
						<Field>
							<FieldLabel>Estado</FieldLabel>
							<ToggleGroup
								onValueChange={(value) => {
									if (value) setStatusFilter(value as CrudStatusFilter);
								}}
								type="single"
								value={statusFilter}
								variant="outline"
							>
								<ToggleGroupItem value="all">Todos</ToggleGroupItem>
								<ToggleGroupItem value="active">Activos</ToggleGroupItem>
								<ToggleGroupItem value="inactive">Inactivos</ToggleGroupItem>
							</ToggleGroup>
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={includeDeleted}
								id="product-include-deleted"
								onCheckedChange={setIncludeDeleted}
							/>
							<FieldContent>
								<FieldLabel htmlFor="product-include-deleted">
									Mostrar eliminados
								</FieldLabel>
								<FieldDescription>Baja lógica</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</div>

				{renderTable()}
			</section>

			<ProductFormDialog
				brands={brandsQuery.data ?? []}
				isLoadingBrands={brandsQuery.isLoading}
				isLoadingProduct={formMode === "edit" && productDetailQuery.isFetching}
				isLoadingSuppliers={suppliersQuery.isLoading}
				isSubmitting={isFormSubmitting}
				mode={formMode}
				onOpenChange={(open) => {
					if (!open) setFormState(closedFormState);
				}}
				onSubmit={handleSubmit}
				open={formState.open}
				product={formMode === "edit" ? productDetailQuery.data : undefined}
				suppliers={suppliersQuery.data ?? []}
			/>

			<ProductPreviewDialog
				errorMessage={
					productPreviewQuery.isError
						? productPreviewQuery.error.message ||
							"No se pudo cargar el preview"
						: undefined
				}
				isLoading={productPreviewQuery.isFetching}
				onOpenChange={(open) => {
					if (!open) setPreviewProductId(null);
				}}
				open={previewProductId !== null}
				preview={productPreviewQuery.data}
			/>

			<CrudDeleteDialog
				confirmLabel="Enviar a papelera"
				description={
					softDeleteTarget
						? `El producto "${softDeleteTarget.name}" quedará eliminado lógicamente e inactivo.`
						: ""
				}
				isPending={softDeleteMutation.isPending}
				onConfirm={() => {
					if (softDeleteTarget) {
						softDeleteMutation.mutate({ id: softDeleteTarget.id });
					}
				}}
				onOpenChange={(open) => {
					if (!open) setSoftDeleteTarget(null);
				}}
				open={Boolean(softDeleteTarget)}
				title="Confirmar baja lógica"
			/>

			<CrudDeleteDialog
				confirmationLabel={
					hardDeleteTarget
						? `Escribí "${hardDeleteTarget.name}" para confirmar`
						: "Confirmación"
				}
				confirmationValue={hardDeleteTarget?.name}
				confirmLabel="Eliminar definitivamente"
				description={
					hardDeleteTarget
						? `Esta acción intenta borrar el producto "${hardDeleteTarget.name}" de la base de datos. Si tiene términos comerciales o restricciones locales, el servidor la va a bloquear.`
						: ""
				}
				isPending={hardDeleteMutation.isPending}
				onConfirm={() => {
					if (hardDeleteTarget) {
						hardDeleteMutation.mutate({ id: hardDeleteTarget.id });
					}
				}}
				onOpenChange={(open) => {
					if (!open) setHardDeleteTarget(null);
				}}
				open={Boolean(hardDeleteTarget)}
				title="Eliminación definitiva"
			/>
		</CrudPageShell>
	);
}
