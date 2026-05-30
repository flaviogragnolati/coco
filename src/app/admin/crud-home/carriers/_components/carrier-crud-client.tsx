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
import { CarrierFormDialog } from "~/features/admin/crud/carrier/carrier-form-dialog";
import { CarrierTable } from "~/features/admin/crud/carrier/carrier-table";
import type {
	CarrierFormValues,
	CarrierListItem,
} from "~/shared/common/admin-crud/carrier.types";
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

export function CarrierCrudClient() {
	const utils = api.useUtils();
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [statusFilter, setStatusFilter] = useState<CrudStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [formState, setFormState] =
		useState<CrudModalState<number>>(closedFormState);
	const [softDeleteTarget, setSoftDeleteTarget] =
		useState<CarrierListItem | null>(null);
	const [hardDeleteTarget, setHardDeleteTarget] =
		useState<CarrierListItem | null>(null);

	const selectedCarrierId =
		formState.open && formState.mode === "edit" ? formState.entityId : null;
	const formMode = formState.mode ?? "create";

	const carriersQuery = api.admin.carrier.list.useQuery({ includeDeleted });
	const statsQuery = api.admin.carrier.getStats.useQuery();
	const carrierDetailQuery = api.admin.carrier.getById.useQuery(
		{ id: selectedCarrierId ?? 0 },
		{ enabled: selectedCarrierId !== null },
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
			setFormState(closedFormState);
			await invalidateCarrierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el carrier");
		},
	});

	const updateMutation = api.admin.carrier.update.useMutation({
		onSuccess: async () => {
			toast.success("Carrier actualizado");
			setFormState(closedFormState);
			await invalidateCarrierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el carrier");
		},
	});

	const softDeleteMutation = api.admin.carrier.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Carrier enviado a papelera");
			setSoftDeleteTarget(null);
			await invalidateCarrierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el carrier");
		},
	});

	const hardDeleteMutation = api.admin.carrier.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Carrier eliminado definitivamente");
			setHardDeleteTarget(null);
			await invalidateCarrierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	useEffect(() => {
		if (
			formState.open &&
			formState.mode === "edit" &&
			carrierDetailQuery.isError
		) {
			toast.error(
				carrierDetailQuery.error.message || "No se pudo cargar el carrier",
			);
			setFormState(closedFormState);
		}
	}, [
		carrierDetailQuery.error,
		carrierDetailQuery.isError,
		formState.mode,
		formState.open,
	]);

	const filteredCarriers = useMemo(() => {
		const search = normalizeSearch(searchTerm);

		return (carriersQuery.data ?? []).filter((carrier) => {
			return (
				matchesCrudStatus(statusFilter, carrier) &&
				matchesSearch(search, [carrier.id, carrier.name, carrier.description])
			);
		});
	}, [carriersQuery.data, searchTerm, statusFilter]);

	const stats = statsQuery.data;
	const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (values: CarrierFormValues) => {
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
		if (carriersQuery.isLoading) return <CrudLoadingState />;

		if (carriersQuery.isError) {
			return (
				<CrudErrorState
					message={
						carriersQuery.error.message ||
						"No se pudo obtener la lista de carriers"
					}
				/>
			);
		}

		if (filteredCarriers.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros o agrega un carrier nuevo."
					title="No hay carriers para mostrar"
				/>
			);
		}

		return (
			<CarrierTable
				carriers={filteredCarriers}
				onEdit={(carrier) =>
					setFormState({
						open: true,
						mode: "edit",
						entityId: carrier.id,
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
			description="Administracion de carriers con datos de direccion, contacto y eliminacion definitiva bloqueada por ordenes relacionadas."
			title="Carriers"
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
							description: "Incluye carriers eliminados",
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
							<FieldLabel htmlFor="carrier-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="carrier-search"
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="ID, nombre o descripcion"
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
								id="carrier-include-deleted"
								onCheckedChange={setIncludeDeleted}
							/>
							<FieldContent>
								<FieldLabel htmlFor="carrier-include-deleted">
									Mostrar eliminados
								</FieldLabel>
								<FieldDescription>Baja logica</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</div>

				{renderTable()}
			</section>

			<CarrierFormDialog
				carrier={formMode === "edit" ? carrierDetailQuery.data : undefined}
				isLoadingCarrier={formMode === "edit" && carrierDetailQuery.isFetching}
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
						? `El carrier "${softDeleteTarget.name}" quedara eliminado logicamente e inactivo.`
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
						? "Esta accion intenta borrar el carrier de la base de datos. Si tiene ordenes relacionadas, el servidor la va a bloquear."
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
