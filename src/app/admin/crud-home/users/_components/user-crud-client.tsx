"use client";

import { toast } from "sonner";

import { CrudEntityPage } from "~/features/admin/crud/_components/crud-entity-page";
import type { CrudEntityCopy } from "~/features/admin/crud/_lib/crud-entity-copy";
import { useCrudEntityPage } from "~/features/admin/crud/_lib/use-crud-entity-page";
import { useCrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import { UserFormDialog } from "~/features/admin/crud/user/user-form-dialog";
import { UserTable } from "~/features/admin/crud/user/user-table";
import type {
	UserFormValues,
	UserListItem,
} from "~/shared/common/admin-crud/user.types";
import { api } from "~/trpc/react";

const userSearchFields = (user: UserListItem) => [
	user.id,
	user.name,
	user.email,
	user.role,
];

const userCopy: CrudEntityCopy<UserListItem> = {
	idPrefix: "user",
	pageShell: {
		title: "Usuarios",
		description:
			"Gestión del perfil interno del usuario, con alta de UUID server-side y administración embebida de direcciones.",
	},
	createButtonLabel: "Agregar nuevo",
	searchPlaceholder: "ID, nombre, email o rol",
	statusLabels: { active: "Activos", inactive: "Inactivos" },
	stats: {
		total: { label: "Total", description: "Incluye usuarios eliminados" },
		active: { label: "Activos", description: "Disponibles para operar" },
		inactive: {
			label: "Inactivos",
			description: "No eliminados, pero pausados",
		},
		deleted: { label: "Eliminados", description: "Baja lógica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminados",
	includeDeletedHint: "Baja lógica",
	listErrorMessage: "No se pudo obtener la lista de usuarios",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar el usuario",
	empty: {
		title: "No hay usuarios para mostrar",
		description: "Ajustá los filtros o agregá un usuario nuevo.",
	},
	softDelete: {
		title: "Confirmar baja lógica",
		confirmLabel: "Enviar a papelera",
		describe: (user) =>
			`El usuario "${user.name}" quedará eliminado lógicamente e inactivo.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: (user) =>
			`Esta acción intenta borrar al usuario "${user.name}" (${user.email}) de la base de datos. Si tiene direcciones, medios de pago, carritos u órdenes, el servidor la va a bloquear.`,
		confirmationValue: (user) => user.email,
		confirmationLabel: (user) => `Escribí "${user.email}" para confirmar`,
	},
};

export function UserCrudClient() {
	const utils = api.useUtils();
	const state = useCrudPageState<string, UserListItem>();

	const usersQuery = api.admin.user.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.user.getStats.useQuery();
	const userDetailQuery = api.admin.user.getById.useQuery(
		{ id: state.selectedId ?? "" },
		{ enabled: state.selectedId !== null },
	);

	// UserFormDialog edits the user's addresses through an embedded field array,
	// so saving a user writes address rows too. Not symmetric: the address page
	// does not invalidate users.
	const invalidateUserQueries = async () => {
		await Promise.all([
			utils.admin.user.list.invalidate(),
			utils.admin.user.getStats.invalidate(),
			utils.admin.user.getById.invalidate(),
			utils.admin.address.list.invalidate(),
			utils.admin.address.getStats.invalidate(),
			utils.admin.address.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.user.create.useMutation({
		onSuccess: async () => {
			toast.success("Usuario creado");
			state.closeForm();
			await invalidateUserQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el usuario");
		},
	});

	const updateMutation = api.admin.user.update.useMutation({
		onSuccess: async () => {
			toast.success("Usuario actualizado");
			state.closeForm();
			await invalidateUserQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el usuario");
		},
	});

	const softDeleteMutation = api.admin.user.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Usuario enviado a papelera");
			state.setSoftDeleteTarget(null);
			await invalidateUserQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el usuario");
		},
	});

	const hardDeleteMutation = api.admin.user.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Usuario eliminado definitivamente");
			state.setHardDeleteTarget(null);
			await invalidateUserQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	const page = useCrudEntityPage({
		state,
		listQuery: usersQuery,
		detailQuery: userDetailQuery,
		createMutation,
		updateMutation,
		searchFields: userSearchFields,
		detailErrorMessage: userCopy.detailErrorMessage,
	});

	const handleSubmit = (values: UserFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	return (
		<CrudEntityPage
			copy={userCopy}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (user) => hardDeleteMutation.mutate({ id: user.id }),
			}}
			listQuery={usersQuery}
			renderFormDialog={() => (
				<UserFormDialog
					isLoadingUser={page.isLoadingDetail}
					isSubmitting={page.isFormSubmitting}
					mode={state.formMode}
					onOpenChange={(open) => {
						if (!open) state.closeForm();
					}}
					onSubmit={handleSubmit}
					open={state.formState.open}
					user={page.detail}
				/>
			)}
			renderTable={() => (
				<UserTable
					onEdit={(user) => state.openEdit(user.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
					users={page.filteredItems}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (user) => softDeleteMutation.mutate({ id: user.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}
