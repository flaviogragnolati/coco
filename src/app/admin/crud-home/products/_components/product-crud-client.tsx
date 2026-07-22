"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CrudEntityPage } from "~/features/admin/crud/_components/crud-entity-page";
import type { CrudEntityCopy } from "~/features/admin/crud/_lib/crud-entity-copy";
import { useCrudEntityPage } from "~/features/admin/crud/_lib/use-crud-entity-page";
import { useCrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import { ProductFormDialog } from "~/features/admin/crud/product/product-form-dialog";
import { ProductPreviewDialog } from "~/features/admin/crud/product/product-preview-dialog";
import { ProductTable } from "~/features/admin/crud/product/product-table";
import type {
	ProductFormValues,
	ProductListItem,
} from "~/shared/common/admin-crud/product.types";
import { api } from "~/trpc/react";

const productSearchFields = (product: ProductListItem) => [
	product.id,
	product.name,
	product.description,
	product.brand?.name ?? null,
	product.defaultSupplier?.name ?? null,
];

const productCopy: CrudEntityCopy<ProductListItem> = {
	idPrefix: "product",
	pageShell: {
		title: "Productos",
		description:
			"Administración de catálogo, imágenes, unidad comercial y relación opcional con marca y proveedor por defecto.",
	},
	createButtonLabel: "Agregar nuevo",
	searchPlaceholder: "ID, nombre, marca o proveedor",
	statusLabels: { active: "Activos", inactive: "Inactivos" },
	stats: {
		total: { label: "Total", description: "Incluye productos eliminados" },
		active: {
			label: "Activos",
			description: "Disponibles para operaciones nuevas",
		},
		inactive: {
			label: "Inactivos",
			description: "No eliminados, pero fuera de uso",
		},
		deleted: { label: "Eliminados", description: "Baja lógica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminados",
	includeDeletedHint: "Baja lógica",
	listErrorMessage: "No se pudo obtener la lista de productos",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar el producto",
	empty: {
		title: "No hay productos para mostrar",
		description: "Ajustá los filtros o agregá un producto nuevo.",
	},
	softDelete: {
		title: "Confirmar baja lógica",
		confirmLabel: "Enviar a papelera",
		describe: (product) =>
			`El producto "${product.name}" quedará eliminado lógicamente e inactivo.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: (product) =>
			`Esta acción intenta borrar el producto "${product.name}" de la base de datos. Si tiene términos comerciales o restricciones locales, el servidor la va a bloquear.`,
		confirmationValue: (product) => product.name,
		confirmationLabel: (product) => `Escribí "${product.name}" para confirmar`,
	},
};

export function ProductCrudClient() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, ProductListItem>();
	const [previewProductId, setPreviewProductId] = useState<number | null>(null);

	const productsQuery = api.admin.product.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.product.getStats.useQuery();
	const brandsQuery = api.admin.brand.list.useQuery({ includeDeleted: true });
	const suppliersQuery = api.admin.supplier.list.useQuery({
		includeDeleted: true,
	});
	const productDetailQuery = api.admin.product.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
	);
	const productPreviewQuery = api.admin.product.getPreview.useQuery(
		{ id: previewProductId ?? 0 },
		{ enabled: previewProductId !== null },
	);

	// ProductFormDialog can create a brand inline, so saving a product may write
	// brand rows and always invalidates the preview projection.
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
			state.closeForm();
			await invalidateProductQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el producto");
		},
	});

	const updateMutation = api.admin.product.update.useMutation({
		onSuccess: async () => {
			toast.success("Producto actualizado");
			state.closeForm();
			await invalidateProductQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el producto");
		},
	});

	const softDeleteMutation = api.admin.product.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Producto enviado a papelera");
			state.setSoftDeleteTarget(null);
			await invalidateProductQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el producto");
		},
	});

	const hardDeleteMutation = api.admin.product.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Producto eliminado definitivamente");
			state.setHardDeleteTarget(null);
			await invalidateProductQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	const page = useCrudEntityPage({
		state,
		listQuery: productsQuery,
		detailQuery: productDetailQuery,
		createMutation,
		updateMutation,
		searchFields: productSearchFields,
		detailErrorMessage: productCopy.detailErrorMessage,
	});

	const handleSubmit = (values: ProductFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	return (
		<CrudEntityPage
			copy={productCopy}
			extras={
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
			}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (product) => hardDeleteMutation.mutate({ id: product.id }),
			}}
			listQuery={productsQuery}
			renderFormDialog={() => (
				<ProductFormDialog
					brands={brandsQuery.data ?? []}
					isLoadingBrands={brandsQuery.isLoading}
					isLoadingProduct={page.isLoadingDetail}
					isLoadingSuppliers={suppliersQuery.isLoading}
					isSubmitting={page.isFormSubmitting}
					mode={state.formMode}
					onOpenChange={(open) => {
						if (!open) state.closeForm();
					}}
					onSubmit={handleSubmit}
					open={state.formState.open}
					product={page.detail}
					suppliers={suppliersQuery.data ?? []}
				/>
			)}
			renderTable={() => (
				<ProductTable
					onEdit={(product) => state.openEdit(product.id)}
					onHardDelete={state.setHardDeleteTarget}
					onPreview={(product) => setPreviewProductId(product.id)}
					onSoftDelete={state.setSoftDeleteTarget}
					products={page.filteredItems}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (product) => softDeleteMutation.mutate({ id: product.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}
