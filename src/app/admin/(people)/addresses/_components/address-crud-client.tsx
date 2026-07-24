"use client";

import { toast } from "sonner";
import { CrudEntityPage } from "~/features/admin/crud/_components/crud-entity-page";
import type { CrudEntityCopy } from "~/features/admin/crud/_lib/crud-entity-copy";
import { useCrudEntityPage } from "~/features/admin/crud/_lib/use-crud-entity-page";
import { useCrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import { AddressFormDialog } from "~/features/admin/crud/address/address-form-dialog";
import { AddressTable } from "~/features/admin/crud/address/address-table";
import type {
	AddressFormValues,
	AddressListItem,
} from "~/shared/common/admin-crud/address.types";
import { api } from "~/trpc/react";

const addressSearchFields = (address: AddressListItem) => [
	address.id,
	address.user.name,
	address.user.email,
	address.line1,
	address.city,
	address.state,
	address.postalCode,
	address.country,
];

const addressCopy: CrudEntityCopy<AddressListItem> = {
	idPrefix: "address",
	pageShell: {
		title: "Direcciones",
		description:
			"Administración independiente de direcciones, con selector de usuario y baja lógica reversible.",
	},
	createButtonLabel: "Agregar nueva",
	searchPlaceholder: "Usuario, calle, ciudad o CP",
	statusLabels: { active: "Activas", inactive: "Inactivas" },
	stats: {
		total: { label: "Total", description: "Incluye direcciones eliminadas" },
		active: { label: "Activas", description: "Disponibles para uso operativo" },
		inactive: {
			label: "Inactivas",
			description: "No eliminadas, pero fuera de uso",
		},
		deleted: { label: "Eliminadas", description: "Baja lógica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminadas",
	includeDeletedHint: "Baja lógica",
	listErrorMessage: "No se pudo obtener la lista de direcciones",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar la dirección",
	empty: {
		title: "No hay direcciones para mostrar",
		description: "Ajustá los filtros o registrá una dirección nueva.",
	},
	softDelete: {
		title: "Confirmar baja lógica",
		confirmLabel: "Enviar a papelera",
		describe: (address) =>
			`La dirección #${address.id} quedará eliminada lógicamente e inactiva.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: (address) =>
			`Esta acción borra la dirección #${address.id} de la base de datos. No hay bloqueos por relaciones hijas definidos actualmente.`,
		confirmationValue: (address) => String(address.id),
		confirmationLabel: (address) => `Escribí "${address.id}" para confirmar`,
	},
};

export function AddressCrudClient() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, AddressListItem>();

	const addressesQuery = api.admin.address.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	// Owners must stay selectable even once soft-deleted, so this list ignores
	// the page's includeDeleted toggle.
	const usersQuery = api.admin.user.list.useQuery({ includeDeleted: true });
	const statsQuery = api.admin.address.getStats.useQuery();
	const addressDetailQuery = api.admin.address.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
	);

	const invalidateAddressQueries = async () => {
		await Promise.all([
			utils.admin.address.list.invalidate(),
			utils.admin.address.getStats.invalidate(),
			utils.admin.address.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.address.create.useMutation({
		onSuccess: async () => {
			toast.success("Dirección creada");
			state.closeForm();
			await invalidateAddressQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear la dirección");
		},
	});

	const updateMutation = api.admin.address.update.useMutation({
		onSuccess: async () => {
			toast.success("Dirección actualizada");
			state.closeForm();
			await invalidateAddressQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar la dirección");
		},
	});

	const softDeleteMutation = api.admin.address.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Dirección enviada a papelera");
			state.setSoftDeleteTarget(null);
			await invalidateAddressQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar la dirección");
		},
	});

	const hardDeleteMutation = api.admin.address.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Dirección eliminada definitivamente");
			state.setHardDeleteTarget(null);
			await invalidateAddressQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	const page = useCrudEntityPage({
		state,
		listQuery: addressesQuery,
		detailQuery: addressDetailQuery,
		createMutation,
		updateMutation,
		searchFields: addressSearchFields,
		detailErrorMessage: addressCopy.detailErrorMessage,
	});

	const handleSubmit = (values: AddressFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	return (
		<CrudEntityPage
			copy={addressCopy}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (address) => hardDeleteMutation.mutate({ id: address.id }),
			}}
			listQuery={addressesQuery}
			renderFormDialog={() => (
				<AddressFormDialog
					address={page.detail}
					isLoadingAddress={page.isLoadingDetail}
					isLoadingUsers={usersQuery.isLoading}
					isSubmitting={page.isFormSubmitting}
					mode={state.formMode}
					onOpenChange={(open) => {
						if (!open) state.closeForm();
					}}
					onSubmit={handleSubmit}
					open={state.formState.open}
					users={usersQuery.data ?? []}
				/>
			)}
			renderTable={() => (
				<AddressTable
					addresses={page.filteredItems}
					onEdit={(address) => state.openEdit(address.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (address) => softDeleteMutation.mutate({ id: address.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}
