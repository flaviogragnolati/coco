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
import { crudStatusStatAccents } from "~/features/admin/crud/_lib/crud-status-stats";
import {
	matchesCrudStatus,
	matchesSearch,
	normalizeSearch,
} from "~/features/admin/crud/_lib/filter-helpers";
import { AddressFormDialog } from "~/features/admin/crud/address/address-form-dialog";
import { AddressTable } from "~/features/admin/crud/address/address-table";
import type {
	AddressFormValues,
	AddressListItem,
} from "~/shared/common/admin-crud/address.types";
import type {
	CrudModalState,
	CrudStatusFilter,
} from "~/shared/common/admin-crud/crud.types";
import { api } from "~/trpc/react";

const closedFormState: CrudModalState<number> = {
	open: false,
	mode: null,
	entityId: null,
};

export function AddressCrudClient() {
	const utils = api.useUtils();
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [statusFilter, setStatusFilter] = useState<CrudStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [formState, setFormState] =
		useState<CrudModalState<number>>(closedFormState);
	const [softDeleteTarget, setSoftDeleteTarget] =
		useState<AddressListItem | null>(null);
	const [hardDeleteTarget, setHardDeleteTarget] =
		useState<AddressListItem | null>(null);

	const selectedAddressId =
		formState.open && formState.mode === "edit" ? formState.entityId : null;
	const formMode = formState.mode ?? "create";

	const addressesQuery = api.admin.address.list.useQuery({ includeDeleted });
	const usersQuery = api.admin.user.list.useQuery({ includeDeleted: true });
	const statsQuery = api.admin.address.getStats.useQuery();
	const addressDetailQuery = api.admin.address.getById.useQuery(
		{ id: selectedAddressId ?? 0 },
		{ enabled: selectedAddressId !== null },
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
			setFormState(closedFormState);
			await invalidateAddressQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear la dirección");
		},
	});

	const updateMutation = api.admin.address.update.useMutation({
		onSuccess: async () => {
			toast.success("Dirección actualizada");
			setFormState(closedFormState);
			await invalidateAddressQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar la dirección");
		},
	});

	const softDeleteMutation = api.admin.address.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Dirección enviada a papelera");
			setSoftDeleteTarget(null);
			await invalidateAddressQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar la dirección");
		},
	});

	const hardDeleteMutation = api.admin.address.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Dirección eliminada definitivamente");
			setHardDeleteTarget(null);
			await invalidateAddressQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	useEffect(() => {
		if (
			formState.open &&
			formState.mode === "edit" &&
			addressDetailQuery.isError
		) {
			toast.error(
				addressDetailQuery.error.message || "No se pudo cargar la dirección",
			);
			setFormState(closedFormState);
		}
	}, [
		addressDetailQuery.error,
		addressDetailQuery.isError,
		formState.mode,
		formState.open,
	]);

	const filteredAddresses = useMemo(() => {
		const search = normalizeSearch(searchTerm);

		return (addressesQuery.data ?? []).filter((address) => {
			return (
				matchesCrudStatus(statusFilter, address) &&
				matchesSearch(search, [
					address.id,
					address.user.name,
					address.user.email,
					address.line1,
					address.city,
					address.state,
					address.postalCode,
					address.country,
				])
			);
		});
	}, [addressesQuery.data, searchTerm, statusFilter]);

	const stats = statsQuery.data;
	const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (values: AddressFormValues) => {
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
		if (addressesQuery.isLoading) return <CrudLoadingState />;

		if (addressesQuery.isError) {
			return (
				<CrudErrorState
					message={
						addressesQuery.error.message ||
						"No se pudo obtener la lista de direcciones"
					}
				/>
			);
		}

		if (filteredAddresses.length === 0) {
			return (
				<CrudEmptyState
					description="Ajustá los filtros o registrá una dirección nueva."
					title="No hay direcciones para mostrar"
				/>
			);
		}

		return (
			<AddressTable
				addresses={filteredAddresses}
				onEdit={(address) =>
					setFormState({
						open: true,
						mode: "edit",
						entityId: address.id,
					})
				}
				onHardDelete={setHardDeleteTarget}
				onSoftDelete={setSoftDeleteTarget}
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
					Agregar nueva
				</Button>
			}
			description="Administración independiente de direcciones, con selector de usuario y baja lógica reversible."
			title="Direcciones"
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
							...crudStatusStatAccents.total,
							description: "Incluye direcciones eliminadas",
						},
						{
							label: "Activas",
							value: stats.active,
							...crudStatusStatAccents.active,
							description: "Disponibles para uso operativo",
						},
						{
							label: "Inactivas",
							value: stats.inactive,
							...crudStatusStatAccents.inactive,
							description: "No eliminadas, pero fuera de uso",
						},
						{
							label: "Eliminadas",
							value: stats.deleted,
							...crudStatusStatAccents.deleted,
							description: "Baja lógica aplicada",
						},
					]}
				/>
			) : null}

			<section className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 rounded-none border p-3 lg:flex-row lg:items-end lg:justify-between">
					<FieldGroup className="grid flex-1 gap-3 md:grid-cols-[minmax(14rem,1fr)_auto_auto] md:items-end">
						<Field>
							<FieldLabel htmlFor="address-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="address-search"
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="Usuario, calle, ciudad o CP"
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
								<ToggleGroupItem value="active">Activas</ToggleGroupItem>
								<ToggleGroupItem value="inactive">Inactivas</ToggleGroupItem>
							</ToggleGroup>
						</Field>
						<Field orientation="horizontal">
							<Switch
								checked={includeDeleted}
								id="address-include-deleted"
								onCheckedChange={setIncludeDeleted}
							/>
							<FieldContent>
								<FieldLabel htmlFor="address-include-deleted">
									Mostrar eliminadas
								</FieldLabel>
								<FieldDescription>Baja lógica</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</div>

				{renderTable()}
			</section>

			<AddressFormDialog
				address={formMode === "edit" ? addressDetailQuery.data : undefined}
				isLoadingAddress={formMode === "edit" && addressDetailQuery.isFetching}
				isLoadingUsers={usersQuery.isLoading}
				isSubmitting={isFormSubmitting}
				mode={formMode}
				onOpenChange={(open) => {
					if (!open) setFormState(closedFormState);
				}}
				onSubmit={handleSubmit}
				open={formState.open}
				users={usersQuery.data ?? []}
			/>

			<CrudDeleteDialog
				confirmLabel="Enviar a papelera"
				description={
					softDeleteTarget
						? `La dirección #${softDeleteTarget.id} quedará eliminada lógicamente e inactiva.`
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
				confirmLabel="Eliminar definitivamente"
				description={
					hardDeleteTarget
						? `Esta acción borra la dirección #${hardDeleteTarget.id} de la base de datos. No hay bloqueos por relaciones hijas definidos actualmente.`
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
