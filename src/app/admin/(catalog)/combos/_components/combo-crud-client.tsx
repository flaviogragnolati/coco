"use client";

import { toast } from "sonner";

import { CrudEntityPage } from "~/features/admin/crud/_components/crud-entity-page";
import type { CrudEntityCopy } from "~/features/admin/crud/_lib/crud-entity-copy";
import { useCrudEntityPage } from "~/features/admin/crud/_lib/use-crud-entity-page";
import { useCrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import { ComboFormDialog } from "~/features/admin/crud/combo/combo-form-dialog";
import { ComboTable } from "~/features/admin/crud/combo/combo-table";
import type {
	ComboCreateInput,
	ComboListItem,
} from "~/shared/common/admin-crud/combo.types";
import { api } from "~/trpc/react";

const comboSearchFields = (combo: ComboListItem) => [
	combo.id,
	combo.name,
	combo.groupName ?? "",
];

const comboCopy: CrudEntityCopy<ComboListItem> = {
	idPrefix: "combo",
	pageShell: {
		title: "Combos",
		description:
			"Conjuntos de productos que el cliente suma al pedido de una vez, cada uno a su precio de hoy. Se muestran en el home cuando están en Destacados.",
	},
	createButtonLabel: "Agregar nuevo",
	searchPlaceholder: "ID, nombre o grupo",
	statusLabels: { active: "Activos", inactive: "Inactivos" },
	stats: {
		total: { label: "Total", description: "Incluye combos eliminados" },
		active: {
			label: "Activos",
			description: "Se pueden mostrar en el home",
		},
		inactive: {
			label: "Inactivos",
			description: "No eliminados, pero fuera del home",
		},
		deleted: { label: "Eliminados", description: "Baja lógica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminados",
	includeDeletedHint: "Baja lógica",
	listErrorMessage: "No se pudo obtener la lista de combos",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar el combo",
	empty: {
		title: "No hay combos para mostrar",
		description: "Ajustá los filtros o armá un combo nuevo.",
	},
	softDelete: {
		title: "Confirmar baja lógica",
		confirmLabel: "Enviar a papelera",
		describe: (combo) =>
			`El combo "${combo.name}" quedará eliminado lógicamente e inactivo, y sale de Destacados y de la banda del home.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: (combo) =>
			`Esta acción borra el combo "${combo.name}" y su lista de productos de la base de datos. Los pedidos no cambian: el combo no deja rastro en ellos.`,
		confirmationValue: (combo) => combo.name,
		confirmationLabel: (combo) => `Escribí "${combo.name}" para confirmar`,
	},
};

export function ComboCrudClient() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, ComboListItem>();

	const combosQuery = api.admin.combo.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.combo.getStats.useQuery();
	const productOptionsQuery = api.admin.combo.productOptions.useQuery(
		undefined,
		{ enabled: state.formState.open },
	);
	const groupNamesQuery = api.admin.combo.groupNames.useQuery(undefined, {
		enabled: state.formState.open,
	});
	const comboDetailQuery = api.admin.combo.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
	);

	const invalidateComboQueries = async () => {
		await Promise.all([
			utils.admin.combo.invalidate(),
			utils.admin.homeOffers.invalidate(),
		]);
	};

	// Validation errors stay in the dialog, next to what the admin has to fix.
	const createMutation = api.admin.combo.create.useMutation({
		onSuccess: async () => {
			toast.success("Combo creado");
			state.closeForm();
			await invalidateComboQueries();
		},
	});

	const updateMutation = api.admin.combo.update.useMutation({
		onSuccess: async () => {
			toast.success("Combo actualizado");
			state.closeForm();
			await invalidateComboQueries();
		},
	});

	const softDeleteMutation = api.admin.combo.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Combo enviado a papelera");
			state.setSoftDeleteTarget(null);
			await invalidateComboQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el combo");
		},
	});

	const hardDeleteMutation = api.admin.combo.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Combo eliminado definitivamente");
			state.setHardDeleteTarget(null);
			await invalidateComboQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	const page = useCrudEntityPage({
		state,
		listQuery: combosQuery,
		detailQuery: comboDetailQuery,
		createMutation,
		updateMutation,
		searchFields: comboSearchFields,
		detailErrorMessage: comboCopy.detailErrorMessage,
	});

	const handleSubmit = (values: ComboCreateInput) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	const activeMutation =
		state.formState.mode === "edit" ? updateMutation : createMutation;

	return (
		<CrudEntityPage
			copy={comboCopy}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (combo) => hardDeleteMutation.mutate({ id: combo.id }),
			}}
			listQuery={combosQuery}
			renderFormDialog={() => (
				<ComboFormDialog
					combo={page.detail}
					groupNames={groupNamesQuery.data ?? []}
					isLoadingCombo={page.isLoadingDetail}
					isSubmitting={page.isFormSubmitting}
					mode={state.formMode}
					onOpenChange={(open) => {
						if (!open) {
							createMutation.reset();
							updateMutation.reset();
							state.closeForm();
						}
					}}
					onSubmit={handleSubmit}
					open={state.formState.open}
					productOptions={productOptionsQuery.data ?? []}
					serverError={activeMutation.error?.message ?? null}
				/>
			)}
			renderTable={() => (
				<ComboTable
					combos={page.filteredItems}
					onEdit={(combo) => state.openEdit(combo.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (combo) => softDeleteMutation.mutate({ id: combo.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}
