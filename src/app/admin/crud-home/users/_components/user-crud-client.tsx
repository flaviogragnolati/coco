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
import { UserFormDialog } from "~/features/admin/crud/user/user-form-dialog";
import { UserTable } from "~/features/admin/crud/user/user-table";
import type {
	CrudModalState,
	CrudStatusFilter,
} from "~/shared/common/admin-crud/crud.types";
import type {
	UserFormValues,
	UserListItem,
} from "~/shared/common/admin-crud/user.types";
import { api } from "~/trpc/react";

const closedFormState: CrudModalState<string> = {
	open: false,
	mode: null,
	entityId: null,
};

export function UserCrudClient() {
	const utils = api.useUtils();
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [statusFilter, setStatusFilter] = useState<CrudStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [formState, setFormState] =
		useState<CrudModalState<string>>(closedFormState);
	const [softDeleteTarget, setSoftDeleteTarget] = useState<UserListItem | null>(
		null,
	);
	const [hardDeleteTarget, setHardDeleteTarget] = useState<UserListItem | null>(
		null,
	);

	const selectedUserId =
		formState.open && formState.mode === "edit" ? formState.entityId : null;
	const formMode = formState.mode ?? "create";

	const usersQuery = api.admin.user.list.useQuery({ includeDeleted });
	const statsQuery = api.admin.user.getStats.useQuery();
	const userDetailQuery = api.admin.user.getById.useQuery(
		{ id: selectedUserId ?? "" },
		{ enabled: selectedUserId !== null },
	);

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
			setFormState(closedFormState);
			await invalidateUserQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el usuario");
		},
	});

	const updateMutation = api.admin.user.update.useMutation({
		onSuccess: async () => {
			toast.success("Usuario actualizado");
			setFormState(closedFormState);
			await invalidateUserQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el usuario");
		},
	});

	const softDeleteMutation = api.admin.user.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Usuario enviado a papelera");
			setSoftDeleteTarget(null);
			await invalidateUserQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el usuario");
		},
	});

	const hardDeleteMutation = api.admin.user.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Usuario eliminado definitivamente");
			setHardDeleteTarget(null);
			await invalidateUserQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	useEffect(() => {
		if (
			formState.open &&
			formState.mode === "edit" &&
			userDetailQuery.isError
		) {
			toast.error(
				userDetailQuery.error.message || "No se pudo cargar el usuario",
			);
			setFormState(closedFormState);
		}
	}, [
		formState.mode,
		formState.open,
		userDetailQuery.error,
		userDetailQuery.isError,
	]);

	const filteredUsers = useMemo(() => {
		const search = normalizeSearch(searchTerm);

		return (usersQuery.data ?? []).filter((user) => {
			return (
				matchesCrudStatus(statusFilter, user) &&
				matchesSearch(search, [user.id, user.name, user.email, user.role])
			);
		});
	}, [searchTerm, statusFilter, usersQuery.data]);

	const stats = statsQuery.data;
	const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (values: UserFormValues) => {
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
		if (usersQuery.isLoading) return <CrudLoadingState />;

		if (usersQuery.isError) {
			return (
				<CrudErrorState
					message={
						usersQuery.error.message ||
						"No se pudo obtener la lista de usuarios"
					}
				/>
			);
		}

		if (filteredUsers.length === 0) {
			return (
				<CrudEmptyState
					description="Ajustá los filtros o agregá un usuario nuevo."
					title="No hay usuarios para mostrar"
				/>
			);
		}

		return (
			<UserTable
				onEdit={(user) =>
					setFormState({
						open: true,
						mode: "edit",
						entityId: user.id,
					})
				}
				onHardDelete={setHardDeleteTarget}
				onSoftDelete={setSoftDeleteTarget}
				users={filteredUsers}
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
			description="Gestión del perfil interno del usuario, con alta de UUID server-side y administración embebida de direcciones."
			title="Usuarios"
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
							description: "Incluye usuarios eliminados",
						},
						{
							label: "Activos",
							value: stats.active,
							description: "Disponibles para operar",
						},
						{
							label: "Inactivos",
							value: stats.inactive,
							description: "No eliminados, pero pausados",
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
							<FieldLabel htmlFor="user-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="user-search"
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="ID, nombre, email o rol"
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
								id="user-include-deleted"
								onCheckedChange={setIncludeDeleted}
							/>
							<FieldContent>
								<FieldLabel htmlFor="user-include-deleted">
									Mostrar eliminados
								</FieldLabel>
								<FieldDescription>Baja lógica</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</div>

				{renderTable()}
			</section>

			<UserFormDialog
				isLoadingUser={formMode === "edit" && userDetailQuery.isFetching}
				isSubmitting={isFormSubmitting}
				mode={formMode}
				onOpenChange={(open) => {
					if (!open) setFormState(closedFormState);
				}}
				onSubmit={handleSubmit}
				open={formState.open}
				user={formMode === "edit" ? userDetailQuery.data : undefined}
			/>

			<CrudDeleteDialog
				confirmLabel="Enviar a papelera"
				description={
					softDeleteTarget
						? `El usuario "${softDeleteTarget.name}" quedará eliminado lógicamente e inactivo.`
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
						? `Escribí "${hardDeleteTarget.email}" para confirmar`
						: "Confirmación"
				}
				confirmationValue={hardDeleteTarget?.email}
				confirmLabel="Eliminar definitivamente"
				description={
					hardDeleteTarget
						? `Esta acción intenta borrar al usuario "${hardDeleteTarget.name}" de la base de datos. Si tiene direcciones, medios de pago, carritos u órdenes, el servidor la va a bloquear.`
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
