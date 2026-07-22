"use client";

import { toast } from "sonner";

import { CrudEntityPage } from "~/features/admin/crud/_components/crud-entity-page";
import type { CrudEntityCopy } from "~/features/admin/crud/_lib/crud-entity-copy";
import { useCrudEntityPage } from "~/features/admin/crud/_lib/use-crud-entity-page";
import { useCrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import { DestinationFormDialog } from "~/features/admin/crud/destination/destination-form-dialog";
import { DestinationTable } from "~/features/admin/crud/destination/destination-table";
import type {
	DestinationFormValues,
	DestinationListItem,
} from "~/shared/common/admin-crud/destination.types";
import { api } from "~/trpc/react";

const destinationSearchFields = (destination: DestinationListItem) => [
	destination.id,
	destination.name,
	destination.description,
	destination.googleMapsUrl,
];

const destinationCopy: CrudEntityCopy<DestinationListItem> = {
	idPrefix: "destination",
	pageShell: {
		title: "Destinos",
		description:
			"Administracion de destinos internos y almacenes con URL opcional de Google Maps.",
	},
	createButtonLabel: "Agregar nuevo",
	searchPlaceholder: "ID, nombre, descripcion o mapa",
	statusLabels: { active: "Activos", inactive: "Inactivos" },
	stats: {
		total: { label: "Total", description: "Incluye destinos eliminados" },
		active: { label: "Activos", description: "Disponibles para operaciones" },
		inactive: {
			label: "Inactivos",
			description: "No eliminados, pero pausados",
		},
		deleted: { label: "Eliminados", description: "Baja logica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminados",
	includeDeletedHint: "Baja logica",
	listErrorMessage: "No se pudo obtener la lista de destinos",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar el destino",
	empty: {
		title: "No hay destinos para mostrar",
		description: "Ajusta los filtros o agrega un destino nuevo.",
	},
	softDelete: {
		title: "Confirmar baja logica",
		confirmLabel: "Enviar a papelera",
		describe: (destination) =>
			`El destino "${destination.name}" quedara eliminado logicamente e inactivo.`,
	},
	hardDelete: {
		title: "Eliminacion definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: () =>
			"Esta accion intenta borrar el destino de la base de datos. Si tiene lot items relacionados, el servidor la va a bloquear.",
		confirmationValue: (destination) => destination.name,
		confirmationLabel: (destination) =>
			`Escribi "${destination.name}" para confirmar`,
	},
};

export function DestinationCrudClient() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, DestinationListItem>();

	const destinationsQuery = api.admin.destination.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.destination.getStats.useQuery();
	const destinationDetailQuery = api.admin.destination.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
	);

	const invalidateDestinationQueries = async () => {
		await Promise.all([
			utils.admin.destination.list.invalidate(),
			utils.admin.destination.getStats.invalidate(),
			utils.admin.destination.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.destination.create.useMutation({
		onSuccess: async () => {
			toast.success("Destino creado");
			state.closeForm();
			await invalidateDestinationQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el destino");
		},
	});

	const updateMutation = api.admin.destination.update.useMutation({
		onSuccess: async () => {
			toast.success("Destino actualizado");
			state.closeForm();
			await invalidateDestinationQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el destino");
		},
	});

	const softDeleteMutation = api.admin.destination.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Destino enviado a papelera");
			state.setSoftDeleteTarget(null);
			await invalidateDestinationQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el destino");
		},
	});

	const hardDeleteMutation = api.admin.destination.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Destino eliminado definitivamente");
			state.setHardDeleteTarget(null);
			await invalidateDestinationQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	const page = useCrudEntityPage({
		state,
		listQuery: destinationsQuery,
		detailQuery: destinationDetailQuery,
		createMutation,
		updateMutation,
		searchFields: destinationSearchFields,
		detailErrorMessage: destinationCopy.detailErrorMessage,
	});

	const handleSubmit = (values: DestinationFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	return (
		<CrudEntityPage
			copy={destinationCopy}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (destination) =>
					hardDeleteMutation.mutate({ id: destination.id }),
			}}
			listQuery={destinationsQuery}
			renderFormDialog={() => (
				<DestinationFormDialog
					destination={page.detail}
					isLoadingDestination={page.isLoadingDetail}
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
				<DestinationTable
					destinations={page.filteredItems}
					onEdit={(destination) => state.openEdit(destination.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (destination) =>
					softDeleteMutation.mutate({ id: destination.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}
