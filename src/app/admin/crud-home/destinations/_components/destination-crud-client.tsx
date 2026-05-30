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
import { DestinationFormDialog } from "~/features/admin/crud/destination/destination-form-dialog";
import { DestinationTable } from "~/features/admin/crud/destination/destination-table";
import type {
	CrudModalState,
	CrudStatusFilter,
} from "~/shared/common/admin-crud/crud.types";
import type {
	DestinationFormValues,
	DestinationListItem,
} from "~/shared/common/admin-crud/destination.types";
import { api } from "~/trpc/react";

const closedFormState: CrudModalState<number> = {
	open: false,
	mode: null,
	entityId: null,
};

export function DestinationCrudClient() {
	const utils = api.useUtils();
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [statusFilter, setStatusFilter] = useState<CrudStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [formState, setFormState] =
		useState<CrudModalState<number>>(closedFormState);
	const [softDeleteTarget, setSoftDeleteTarget] =
		useState<DestinationListItem | null>(null);
	const [hardDeleteTarget, setHardDeleteTarget] =
		useState<DestinationListItem | null>(null);

	const selectedDestinationId =
		formState.open && formState.mode === "edit" ? formState.entityId : null;
	const formMode = formState.mode ?? "create";

	const destinationsQuery = api.admin.destination.list.useQuery({
		includeDeleted,
	});
	const statsQuery = api.admin.destination.getStats.useQuery();
	const destinationDetailQuery = api.admin.destination.getById.useQuery(
		{ id: selectedDestinationId ?? 0 },
		{ enabled: selectedDestinationId !== null },
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
			setFormState(closedFormState);
			await invalidateDestinationQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el destino");
		},
	});

	const updateMutation = api.admin.destination.update.useMutation({
		onSuccess: async () => {
			toast.success("Destino actualizado");
			setFormState(closedFormState);
			await invalidateDestinationQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el destino");
		},
	});

	const softDeleteMutation = api.admin.destination.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Destino enviado a papelera");
			setSoftDeleteTarget(null);
			await invalidateDestinationQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el destino");
		},
	});

	const hardDeleteMutation = api.admin.destination.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Destino eliminado definitivamente");
			setHardDeleteTarget(null);
			await invalidateDestinationQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	useEffect(() => {
		if (
			formState.open &&
			formState.mode === "edit" &&
			destinationDetailQuery.isError
		) {
			toast.error(
				destinationDetailQuery.error.message || "No se pudo cargar el destino",
			);
			setFormState(closedFormState);
		}
	}, [
		destinationDetailQuery.error,
		destinationDetailQuery.isError,
		formState.mode,
		formState.open,
	]);

	const filteredDestinations = useMemo(() => {
		const search = normalizeSearch(searchTerm);

		return (destinationsQuery.data ?? []).filter((destination) => {
			return (
				matchesCrudStatus(statusFilter, destination) &&
				matchesSearch(search, [
					destination.id,
					destination.name,
					destination.description,
					destination.googleMapsUrl,
				])
			);
		});
	}, [destinationsQuery.data, searchTerm, statusFilter]);

	const stats = statsQuery.data;
	const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (values: DestinationFormValues) => {
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
		if (destinationsQuery.isLoading) return <CrudLoadingState />;

		if (destinationsQuery.isError) {
			return (
				<CrudErrorState
					message={
						destinationsQuery.error.message ||
						"No se pudo obtener la lista de destinos"
					}
				/>
			);
		}

		if (filteredDestinations.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros o agrega un destino nuevo."
					title="No hay destinos para mostrar"
				/>
			);
		}

		return (
			<DestinationTable
				destinations={filteredDestinations}
				onEdit={(destination) =>
					setFormState({
						open: true,
						mode: "edit",
						entityId: destination.id,
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
					Agregar nuevo
				</Button>
			}
			description="Administracion de destinos internos y almacenes con URL opcional de Google Maps."
			title="Destinos"
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
							description: "Incluye destinos eliminados",
						},
						{
							label: "Activos",
							value: stats.active,
							description: "Disponibles para operaciones",
						},
						{
							label: "Inactivos",
							value: stats.inactive,
							description: "No eliminados, pero pausados",
						},
						{
							label: "Eliminados",
							value: stats.deleted,
							description: "Baja logica aplicada",
						},
					]}
				/>
			) : null}

			<section className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 rounded-none border p-3 lg:flex-row lg:items-end lg:justify-between">
					<FieldGroup className="grid flex-1 gap-3 md:grid-cols-[minmax(14rem,1fr)_auto_auto] md:items-end">
						<Field>
							<FieldLabel htmlFor="destination-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="destination-search"
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="ID, nombre, descripcion o mapa"
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
								id="destination-include-deleted"
								onCheckedChange={setIncludeDeleted}
							/>
							<FieldContent>
								<FieldLabel htmlFor="destination-include-deleted">
									Mostrar eliminados
								</FieldLabel>
								<FieldDescription>Baja logica</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</div>

				{renderTable()}
			</section>

			<DestinationFormDialog
				destination={
					formMode === "edit" ? destinationDetailQuery.data : undefined
				}
				isLoadingDestination={
					formMode === "edit" && destinationDetailQuery.isFetching
				}
				isSubmitting={isFormSubmitting}
				mode={formMode}
				onOpenChange={(open) => {
					if (!open) setFormState(closedFormState);
				}}
				onSubmit={handleSubmit}
				open={formState.open}
			/>

			<CrudDeleteDialog
				confirmLabel="Enviar a papelera"
				description={
					softDeleteTarget
						? `El destino "${softDeleteTarget.name}" quedara eliminado logicamente e inactivo.`
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
				title="Confirmar baja logica"
			/>

			<CrudDeleteDialog
				confirmationLabel={
					hardDeleteTarget
						? `Escribi "${hardDeleteTarget.name}" para confirmar`
						: "Confirmacion"
				}
				confirmationValue={hardDeleteTarget?.name}
				confirmLabel="Eliminar definitivamente"
				description={
					hardDeleteTarget
						? "Esta accion intenta borrar el destino de la base de datos. Si tiene lot items relacionados, el servidor la va a bloquear."
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
				title="Eliminacion definitiva"
			/>
		</CrudPageShell>
	);
}
