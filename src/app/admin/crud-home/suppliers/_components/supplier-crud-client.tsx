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
import { SupplierFormDialog } from "~/features/admin/crud/supplier/supplier-form-dialog";
import { SupplierTable } from "~/features/admin/crud/supplier/supplier-table";
import type {
	CrudModalState,
	CrudStatusFilter,
} from "~/shared/common/admin-crud/crud.types";
import type {
	SupplierFormValues,
	SupplierListItem,
} from "~/shared/common/admin-crud/supplier.types";
import { api } from "~/trpc/react";

const closedFormState: CrudModalState<number> = {
	open: false,
	mode: null,
	entityId: null,
};

export function SupplierCrudClient() {
	const utils = api.useUtils();
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [statusFilter, setStatusFilter] = useState<CrudStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [formState, setFormState] =
		useState<CrudModalState<number>>(closedFormState);
	const [softDeleteTarget, setSoftDeleteTarget] =
		useState<SupplierListItem | null>(null);
	const [hardDeleteTarget, setHardDeleteTarget] =
		useState<SupplierListItem | null>(null);

	const selectedSupplierId =
		formState.open && formState.mode === "edit" ? formState.entityId : null;
	const formMode = formState.mode ?? "create";

	const suppliersQuery = api.admin.supplier.list.useQuery({ includeDeleted });
	const statsQuery = api.admin.supplier.getStats.useQuery();
	const supplierDetailQuery = api.admin.supplier.getById.useQuery(
		{ id: selectedSupplierId ?? 0 },
		{ enabled: selectedSupplierId !== null },
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
			setFormState(closedFormState);
			await invalidateSupplierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el proveedor");
		},
	});

	const updateMutation = api.admin.supplier.update.useMutation({
		onSuccess: async () => {
			toast.success("Proveedor actualizado");
			setFormState(closedFormState);
			await invalidateSupplierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el proveedor");
		},
	});

	const softDeleteMutation = api.admin.supplier.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Proveedor enviado a papelera");
			setSoftDeleteTarget(null);
			await invalidateSupplierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el proveedor");
		},
	});

	const hardDeleteMutation = api.admin.supplier.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Proveedor eliminado definitivamente");
			setHardDeleteTarget(null);
			await invalidateSupplierQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	useEffect(() => {
		if (
			formState.open &&
			formState.mode === "edit" &&
			supplierDetailQuery.isError
		) {
			toast.error(
				supplierDetailQuery.error.message || "No se pudo cargar el proveedor",
			);
			setFormState(closedFormState);
		}
	}, [
		formState.mode,
		formState.open,
		supplierDetailQuery.error,
		supplierDetailQuery.isError,
	]);

	const filteredSuppliers = useMemo(() => {
		const search = normalizeSearch(searchTerm);

		return (suppliersQuery.data ?? []).filter((supplier) => {
			return (
				matchesCrudStatus(statusFilter, supplier) &&
				matchesSearch(search, [
					supplier.id,
					supplier.name,
					supplier.description,
				])
			);
		});
	}, [searchTerm, statusFilter, suppliersQuery.data]);

	const stats = statsQuery.data;
	const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (values: SupplierFormValues) => {
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
		if (suppliersQuery.isLoading) return <CrudLoadingState />;

		if (suppliersQuery.isError) {
			return (
				<CrudErrorState
					message={
						suppliersQuery.error.message ||
						"No se pudo obtener la lista de proveedores"
					}
				/>
			);
		}

		if (filteredSuppliers.length === 0) {
			return (
				<CrudEmptyState
					description="Ajustá los filtros o agregá un proveedor nuevo."
					title="No hay proveedores para mostrar"
				/>
			);
		}

		return (
			<SupplierTable
				onEdit={(supplier) =>
					setFormState({
						open: true,
						mode: "edit",
						entityId: supplier.id,
					})
				}
				onHardDelete={setHardDeleteTarget}
				onSoftDelete={setSoftDeleteTarget}
				suppliers={filteredSuppliers}
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
			description="Administración de proveedores con baja lógica, validación de datos de contacto y eliminación definitiva controlada."
			title="Proveedores"
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
							description: "Incluye proveedores eliminados",
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
							description: "Baja lógica aplicada",
						},
					]}
				/>
			) : null}

			<section className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 rounded-none border p-3 lg:flex-row lg:items-end lg:justify-between">
					<FieldGroup className="grid flex-1 gap-3 md:grid-cols-[minmax(14rem,1fr)_auto_auto] md:items-end">
						<Field>
							<FieldLabel htmlFor="supplier-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="supplier-search"
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="ID, nombre o descripción"
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
								id="include-deleted"
								onCheckedChange={setIncludeDeleted}
							/>
							<FieldContent>
								<FieldLabel htmlFor="include-deleted">
									Mostrar eliminados
								</FieldLabel>
								<FieldDescription>Baja lógica</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</div>

				{renderTable()}
			</section>

			<SupplierFormDialog
				isLoadingSupplier={
					formMode === "edit" && supplierDetailQuery.isFetching
				}
				isSubmitting={isFormSubmitting}
				mode={formMode}
				onOpenChange={(open) => {
					if (!open) setFormState(closedFormState);
				}}
				onSubmit={handleSubmit}
				open={formState.open}
				supplier={formMode === "edit" ? supplierDetailQuery.data : undefined}
			/>

			<CrudDeleteDialog
				confirmLabel="Enviar a papelera"
				description={
					softDeleteTarget
						? `El proveedor "${softDeleteTarget.name}" quedará eliminado lógicamente e inactivo.`
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
						? `Escribí "${hardDeleteTarget.name}" para confirmar`
						: "Confirmación"
				}
				confirmationValue={hardDeleteTarget?.name}
				confirmLabel="Eliminar definitivamente"
				description={
					hardDeleteTarget
						? "Esta acción intenta borrar el proveedor de la base de datos. Si tiene lotes, términos u órdenes de proveedor relacionadas, el servidor la va a bloquear."
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
