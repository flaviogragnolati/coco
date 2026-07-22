"use client";

import { toast } from "sonner";

import { CrudEntityPage } from "~/features/admin/crud/_components/crud-entity-page";
import type { CrudEntityCopy } from "~/features/admin/crud/_lib/crud-entity-copy";
import { useCrudEntityPage } from "~/features/admin/crud/_lib/use-crud-entity-page";
import { useCrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import { CarrierFormDialog } from "~/features/admin/crud/carrier/carrier-form-dialog";
import { CarrierTable } from "~/features/admin/crud/carrier/carrier-table";
import type {
	CarrierFormValues,
	CarrierListItem,
} from "~/shared/common/admin-crud/carrier.types";
import { api } from "~/trpc/react";

const carrierSearchFields = (carrier: CarrierListItem) => [
	carrier.id,
	carrier.name,
	carrier.description,
];

const carrierCopy: CrudEntityCopy<CarrierListItem> = {
	idPrefix: "carrier",
	pageShell: {
		title: "Carriers",
		description:
			"Administración de carriers con datos de dirección, contacto y eliminación definitiva bloqueada por órdenes relacionadas.",
	},
	createButtonLabel: "Agregar nuevo",
	searchPlaceholder: "ID, nombre o descripción",
	statusLabels: { active: "Activos", inactive: "Inactivos" },
	stats: {
		total: { label: "Total", description: "Incluye carriers eliminados" },
		active: { label: "Activos", description: "Disponibles para operaciones" },
		inactive: {
			label: "Inactivos",
			description: "No eliminados, pero pausados",
		},
		deleted: { label: "Eliminados", description: "Baja lógica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminados",
	includeDeletedHint: "Baja lógica",
	listErrorMessage: "No se pudo obtener la lista de carriers",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar el carrier",
	empty: {
		title: "No hay carriers para mostrar",
		description: "Ajustá los filtros o agregá un carrier nuevo.",
	},
	softDelete: {
		title: "Confirmar baja lógica",
		confirmLabel: "Enviar a papelera",
		describe: (carrier) =>
			`El carrier "${carrier.name}" quedará eliminado lógicamente e inactivo.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: (carrier) =>
			`Esta acción intenta borrar el carrier "${carrier.name}" de la base de datos. Si tiene órdenes relacionadas, el servidor la va a bloquear.`,
		confirmationValue: (carrier) => carrier.name,
		confirmationLabel: (carrier) => `Escribí "${carrier.name}" para confirmar`,
	},
};

export function CarrierCrudClient() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, CarrierListItem>();

	const carriersQuery = api.admin.carrier.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.carrier.getStats.useQuery();
	const carrierDetailQuery = api.admin.carrier.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
	);

	const invalidateCarrierQueries = async () => {
		await Promise.all([
			utils.admin.carrier.list.invalidate(),
			utils.admin.carrier.getStats.invalidate(),
			utils.admin.carrier.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.carrier.create.useMutation({
		onSuccess: async () => {
			toast.success("Carrier creado");
			state.closeForm();
			await invalidateCarrierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el carrier");
		},
	});

	const updateMutation = api.admin.carrier.update.useMutation({
		onSuccess: async () => {
			toast.success("Carrier actualizado");
			state.closeForm();
			await invalidateCarrierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el carrier");
		},
	});

	const softDeleteMutation = api.admin.carrier.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Carrier enviado a papelera");
			state.setSoftDeleteTarget(null);
			await invalidateCarrierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el carrier");
		},
	});

	const hardDeleteMutation = api.admin.carrier.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Carrier eliminado definitivamente");
			state.setHardDeleteTarget(null);
			await invalidateCarrierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	const page = useCrudEntityPage({
		state,
		listQuery: carriersQuery,
		detailQuery: carrierDetailQuery,
		createMutation,
		updateMutation,
		searchFields: carrierSearchFields,
		detailErrorMessage: carrierCopy.detailErrorMessage,
	});

	const handleSubmit = (values: CarrierFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	return (
		<CrudEntityPage
			copy={carrierCopy}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (carrier) => hardDeleteMutation.mutate({ id: carrier.id }),
			}}
			listQuery={carriersQuery}
			renderFormDialog={() => (
				<CarrierFormDialog
					carrier={page.detail}
					isLoadingCarrier={page.isLoadingDetail}
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
				<CarrierTable
					carriers={page.filteredItems}
					onEdit={(carrier) => state.openEdit(carrier.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (carrier) => softDeleteMutation.mutate({ id: carrier.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}
