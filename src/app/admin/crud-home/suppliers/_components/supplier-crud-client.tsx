"use client";

import { toast } from "sonner";

import { CrudEntityPage } from "~/features/admin/crud/_components/crud-entity-page";
import type { CrudEntityCopy } from "~/features/admin/crud/_lib/crud-entity-copy";
import { useCrudEntityPage } from "~/features/admin/crud/_lib/use-crud-entity-page";
import { useCrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import { SupplierFormDialog } from "~/features/admin/crud/supplier/supplier-form-dialog";
import { SupplierTable } from "~/features/admin/crud/supplier/supplier-table";
import type {
	SupplierFormValues,
	SupplierListItem,
} from "~/shared/common/admin-crud/supplier.types";
import { api } from "~/trpc/react";

const supplierSearchFields = (supplier: SupplierListItem) => [
	supplier.id,
	supplier.name,
	supplier.description,
];

const supplierCopy: CrudEntityCopy<SupplierListItem> = {
	idPrefix: "supplier",
	pageShell: {
		title: "Proveedores",
		description:
			"Administración de proveedores con baja lógica, validación de datos de contacto y eliminación definitiva controlada.",
	},
	createButtonLabel: "Agregar nuevo",
	searchPlaceholder: "ID, nombre o descripción",
	statusLabels: { active: "Activos", inactive: "Inactivos" },
	stats: {
		total: { label: "Total", description: "Incluye proveedores eliminados" },
		active: { label: "Activos", description: "Disponibles para operaciones" },
		inactive: {
			label: "Inactivos",
			description: "No eliminados, pero pausados",
		},
		deleted: { label: "Eliminados", description: "Baja lógica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminados",
	includeDeletedHint: "Baja lógica",
	listErrorMessage: "No se pudo obtener la lista de proveedores",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar el proveedor",
	empty: {
		title: "No hay proveedores para mostrar",
		description: "Ajustá los filtros o agregá un proveedor nuevo.",
	},
	softDelete: {
		title: "Confirmar baja lógica",
		confirmLabel: "Enviar a papelera",
		describe: (supplier) =>
			`El proveedor "${supplier.name}" quedará eliminado lógicamente e inactivo.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: (supplier) =>
			`Esta acción intenta borrar el proveedor "${supplier.name}" de la base de datos. Si tiene lotes, términos u órdenes de proveedor relacionadas, el servidor la va a bloquear.`,
		confirmationValue: (supplier) => supplier.name,
		confirmationLabel: (supplier) =>
			`Escribí "${supplier.name}" para confirmar`,
	},
};

export function SupplierCrudClient() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, SupplierListItem>();

	const suppliersQuery = api.admin.supplier.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.supplier.getStats.useQuery();
	const supplierDetailQuery = api.admin.supplier.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
	);

	const invalidateSupplierQueries = async () => {
		await Promise.all([
			utils.admin.supplier.list.invalidate(),
			utils.admin.supplier.getStats.invalidate(),
			utils.admin.supplier.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.supplier.create.useMutation({
		onSuccess: async () => {
			toast.success("Proveedor creado");
			state.closeForm();
			await invalidateSupplierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el proveedor");
		},
	});

	const updateMutation = api.admin.supplier.update.useMutation({
		onSuccess: async () => {
			toast.success("Proveedor actualizado");
			state.closeForm();
			await invalidateSupplierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el proveedor");
		},
	});

	const softDeleteMutation = api.admin.supplier.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Proveedor enviado a papelera");
			state.setSoftDeleteTarget(null);
			await invalidateSupplierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el proveedor");
		},
	});

	const hardDeleteMutation = api.admin.supplier.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Proveedor eliminado definitivamente");
			state.setHardDeleteTarget(null);
			await invalidateSupplierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	const page = useCrudEntityPage({
		state,
		listQuery: suppliersQuery,
		detailQuery: supplierDetailQuery,
		createMutation,
		updateMutation,
		searchFields: supplierSearchFields,
		detailErrorMessage: supplierCopy.detailErrorMessage,
	});

	const handleSubmit = (values: SupplierFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	return (
		<CrudEntityPage
			copy={supplierCopy}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (supplier) => hardDeleteMutation.mutate({ id: supplier.id }),
			}}
			listQuery={suppliersQuery}
			renderFormDialog={() => (
				<SupplierFormDialog
					isLoadingSupplier={page.isLoadingDetail}
					isSubmitting={page.isFormSubmitting}
					mode={state.formMode}
					onOpenChange={(open) => {
						if (!open) state.closeForm();
					}}
					onSubmit={handleSubmit}
					open={state.formState.open}
					supplier={page.detail}
				/>
			)}
			renderTable={() => (
				<SupplierTable
					onEdit={(supplier) => state.openEdit(supplier.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
					suppliers={page.filteredItems}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (supplier) => softDeleteMutation.mutate({ id: supplier.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}
