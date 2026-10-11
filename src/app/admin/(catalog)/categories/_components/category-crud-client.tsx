"use client";

import { toast } from "sonner";

import { CrudEntityPage } from "~/features/admin/crud/_components/crud-entity-page";
import type { CrudEntityCopy } from "~/features/admin/crud/_lib/crud-entity-copy";
import { useCrudEntityPage } from "~/features/admin/crud/_lib/use-crud-entity-page";
import { useCrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import { CategoryFormDialog } from "~/features/admin/crud/category/category-form-dialog";
import { CategoryTable } from "~/features/admin/crud/category/category-table";
import { nextCategorySortOrder } from "~/features/admin/crud/category/category.mappers";
import type {
	CategoryFormValues,
	CategoryListItem,
} from "~/shared/common/admin-crud/category.types";
import { api } from "~/trpc/react";

const categorySearchFields = (category: CategoryListItem) => [
	category.id,
	category.name,
];

const categoryCopy: CrudEntityCopy<CategoryListItem> = {
	idPrefix: "category",
	pageShell: {
		title: "Categorías",
		description:
			"Categorías del catálogo, en el orden en que se muestran, con baja lógica y bloqueo de eliminación definitiva cuando todavía hay productos asociados.",
	},
	createButtonLabel: "Agregar nueva",
	searchPlaceholder: "ID o nombre",
	statusLabels: { active: "Activas", inactive: "Inactivas" },
	stats: {
		total: { label: "Total", description: "Incluye categorías eliminadas" },
		active: {
			label: "Activas",
			description: "Visibles en el catálogo",
		},
		inactive: {
			label: "Inactivas",
			description: "No eliminadas, pero fuera del catálogo",
		},
		deleted: { label: "Eliminadas", description: "Baja lógica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminadas",
	includeDeletedHint: "Baja lógica",
	listErrorMessage: "No se pudo obtener la lista de categorías",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar la categoría",
	empty: {
		title: "No hay categorías para mostrar",
		description: "Ajustá los filtros o registrá una categoría nueva.",
	},
	softDelete: {
		title: "Confirmar baja lógica",
		confirmLabel: "Enviar a papelera",
		describe: (category) =>
			`La categoría "${category.name}" quedará eliminada lógicamente e inactiva. Sus productos la conservan, pero el catálogo deja de mostrarla.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: (category) =>
			`Esta acción intenta borrar la categoría "${category.name}" de la base de datos. Si todavía hay productos que la referencian, el servidor va a bloquear la operación.`,
		confirmationValue: (category) => category.name,
		confirmationLabel: (category) =>
			`Escribí "${category.name}" para confirmar`,
	},
};

export function CategoryCrudClient() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, CategoryListItem>();

	const categoriesQuery = api.admin.category.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.category.getStats.useQuery();
	const categoryDetailQuery = api.admin.category.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
	);

	const invalidateCategoryQueries = async () => {
		await Promise.all([
			utils.admin.category.list.invalidate(),
			utils.admin.category.getStats.invalidate(),
			utils.admin.category.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.category.create.useMutation({
		onSuccess: async () => {
			toast.success("Categoría creada");
			state.closeForm();
			await invalidateCategoryQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear la categoría");
		},
	});

	const updateMutation = api.admin.category.update.useMutation({
		onSuccess: async () => {
			toast.success("Categoría actualizada");
			state.closeForm();
			await invalidateCategoryQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar la categoría");
		},
	});

	const softDeleteMutation = api.admin.category.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Categoría enviada a papelera");
			state.setSoftDeleteTarget(null);
			await invalidateCategoryQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar la categoría");
		},
	});

	const hardDeleteMutation = api.admin.category.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Categoría eliminada definitivamente");
			state.setHardDeleteTarget(null);
			await invalidateCategoryQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	const page = useCrudEntityPage({
		state,
		listQuery: categoriesQuery,
		detailQuery: categoryDetailQuery,
		createMutation,
		updateMutation,
		searchFields: categorySearchFields,
		detailErrorMessage: categoryCopy.detailErrorMessage,
	});

	const handleSubmit = (values: CategoryFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	return (
		<CrudEntityPage
			copy={categoryCopy}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (category) => hardDeleteMutation.mutate({ id: category.id }),
			}}
			listQuery={categoriesQuery}
			renderFormDialog={() => (
				<CategoryFormDialog
					category={page.detail}
					defaultSortOrder={nextCategorySortOrder(categoriesQuery.data ?? [])}
					isLoadingCategory={page.isLoadingDetail}
					isSubmitting={page.isFormSubmitting}
					mode={state.formMode}
					onOpenChange={(open) => {
						if (!open) state.closeForm();
					}}
					onSubmit={handleSubmit}
					open={state.formState.open}
				/>
			)}
			renderTable={() => (
				<CategoryTable
					categories={page.filteredItems}
					onEdit={(category) => state.openEdit(category.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (category) => softDeleteMutation.mutate({ id: category.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}
