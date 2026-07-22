"use client";

import { toast } from "sonner";

import { CrudEntityPage } from "~/features/admin/crud/_components/crud-entity-page";
import type { CrudEntityCopy } from "~/features/admin/crud/_lib/crud-entity-copy";
import { useCrudEntityPage } from "~/features/admin/crud/_lib/use-crud-entity-page";
import { useCrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import { BrandFormDialog } from "~/features/admin/crud/brand/brand-form-dialog";
import { BrandTable } from "~/features/admin/crud/brand/brand-table";
import type {
	BrandFormValues,
	BrandListItem,
} from "~/shared/common/admin-crud/brand.types";
import { api } from "~/trpc/react";

const brandSearchFields = (brand: BrandListItem) => [
	brand.id,
	brand.name,
	brand.description,
	brand.logoUrl,
];

const brandCopy: CrudEntityCopy<BrandListItem> = {
	idPrefix: "brand",
	pageShell: {
		title: "Marcas",
		description:
			"Administración de marcas comerciales con baja lógica y bloqueo de eliminación definitiva cuando todavía existen productos asociados.",
	},
	createButtonLabel: "Agregar nueva",
	searchPlaceholder: "ID, nombre, descripción o logo",
	statusLabels: { active: "Activas", inactive: "Inactivas" },
	stats: {
		total: { label: "Total", description: "Incluye marcas eliminadas" },
		active: {
			label: "Activas",
			description: "Disponibles para nuevos productos",
		},
		inactive: {
			label: "Inactivas",
			description: "No eliminadas, pero fuera de uso",
		},
		deleted: { label: "Eliminadas", description: "Baja lógica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminadas",
	includeDeletedHint: "Baja lógica",
	listErrorMessage: "No se pudo obtener la lista de marcas",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar la marca",
	empty: {
		title: "No hay marcas para mostrar",
		description: "Ajustá los filtros o registrá una marca nueva.",
	},
	softDelete: {
		title: "Confirmar baja lógica",
		confirmLabel: "Enviar a papelera",
		describe: (brand) =>
			`La marca "${brand.name}" quedará eliminada lógicamente e inactiva.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: (brand) =>
			`Esta acción intenta borrar la marca "${brand.name}" de la base de datos. Si todavía hay productos que la referencian, el servidor va a bloquear la operación.`,
		confirmationValue: (brand) => brand.name,
		confirmationLabel: (brand) => `Escribí "${brand.name}" para confirmar`,
	},
};

export function BrandCrudClient() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, BrandListItem>();

	const brandsQuery = api.admin.brand.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.brand.getStats.useQuery();
	const brandDetailQuery = api.admin.brand.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
	);

	const invalidateBrandQueries = async () => {
		await Promise.all([
			utils.admin.brand.list.invalidate(),
			utils.admin.brand.getStats.invalidate(),
			utils.admin.brand.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.brand.create.useMutation({
		onSuccess: async () => {
			toast.success("Marca creada");
			state.closeForm();
			await invalidateBrandQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear la marca");
		},
	});

	const updateMutation = api.admin.brand.update.useMutation({
		onSuccess: async () => {
			toast.success("Marca actualizada");
			state.closeForm();
			await invalidateBrandQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar la marca");
		},
	});

	const softDeleteMutation = api.admin.brand.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Marca enviada a papelera");
			state.setSoftDeleteTarget(null);
			await invalidateBrandQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar la marca");
		},
	});

	const hardDeleteMutation = api.admin.brand.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Marca eliminada definitivamente");
			state.setHardDeleteTarget(null);
			await invalidateBrandQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	const page = useCrudEntityPage({
		state,
		listQuery: brandsQuery,
		detailQuery: brandDetailQuery,
		createMutation,
		updateMutation,
		searchFields: brandSearchFields,
		detailErrorMessage: brandCopy.detailErrorMessage,
	});

	const handleSubmit = (values: BrandFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	return (
		<CrudEntityPage
			copy={brandCopy}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (brand) => hardDeleteMutation.mutate({ id: brand.id }),
			}}
			listQuery={brandsQuery}
			renderFormDialog={() => (
				<BrandFormDialog
					brand={page.detail}
					isLoadingBrand={page.isLoadingDetail}
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
				<BrandTable
					brands={page.filteredItems}
					onEdit={(brand) => state.openEdit(brand.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (brand) => softDeleteMutation.mutate({ id: brand.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}
