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
import { BrandFormDialog } from "~/features/admin/crud/brand/brand-form-dialog";
import { BrandTable } from "~/features/admin/crud/brand/brand-table";
import type {
	BrandFormValues,
	BrandListItem,
} from "~/shared/common/admin-crud/brand.types";
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

export function BrandCrudClient() {
	const utils = api.useUtils();
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [statusFilter, setStatusFilter] = useState<CrudStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [formState, setFormState] =
		useState<CrudModalState<number>>(closedFormState);
	const [softDeleteTarget, setSoftDeleteTarget] =
		useState<BrandListItem | null>(null);
	const [hardDeleteTarget, setHardDeleteTarget] =
		useState<BrandListItem | null>(null);

	const selectedBrandId =
		formState.open && formState.mode === "edit" ? formState.entityId : null;
	const formMode = formState.mode ?? "create";

	const brandsQuery = api.admin.brand.list.useQuery({ includeDeleted });
	const statsQuery = api.admin.brand.getStats.useQuery();
	const brandDetailQuery = api.admin.brand.getById.useQuery(
		{ id: selectedBrandId ?? 0 },
		{ enabled: selectedBrandId !== null },
	);

	const invalidateBrandQueries = async () => {
		await Promise.all([
			utils.admin.brand.list.invalidate(),
			utils.admin.brand.getStats.invalidate(),
			utils.admin.brand.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.brand.create.useMutation({
		onSuccess: async () => {
			toast.success("Marca creada");
			setFormState(closedFormState);
			await invalidateBrandQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear la marca");
		},
	});

	const updateMutation = api.admin.brand.update.useMutation({
		onSuccess: async () => {
			toast.success("Marca actualizada");
			setFormState(closedFormState);
			await invalidateBrandQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar la marca");
		},
	});

	const softDeleteMutation = api.admin.brand.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Marca enviada a papelera");
			setSoftDeleteTarget(null);
			await invalidateBrandQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar la marca");
		},
	});

	const hardDeleteMutation = api.admin.brand.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Marca eliminada definitivamente");
			setHardDeleteTarget(null);
			await invalidateBrandQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	useEffect(() => {
		if (
			formState.open &&
			formState.mode === "edit" &&
			brandDetailQuery.isError
		) {
			toast.error(
				brandDetailQuery.error.message || "No se pudo cargar la marca",
			);
			setFormState(closedFormState);
		}
	}, [
		brandDetailQuery.error,
		brandDetailQuery.isError,
		formState.mode,
		formState.open,
	]);

	const filteredBrands = useMemo(() => {
		const search = normalizeSearch(searchTerm);

		return (brandsQuery.data ?? []).filter((brand) => {
			return (
				matchesCrudStatus(statusFilter, brand) &&
				matchesSearch(search, [
					brand.id,
					brand.name,
					brand.description,
					brand.logoUrl,
				])
			);
		});
	}, [brandsQuery.data, searchTerm, statusFilter]);

	const stats = statsQuery.data;
	const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (values: BrandFormValues) => {
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
		if (brandsQuery.isLoading) return <CrudLoadingState />;

		if (brandsQuery.isError) {
			return (
				<CrudErrorState
					message={
						brandsQuery.error.message || "No se pudo obtener la lista de marcas"
					}
				/>
			);
		}

		if (filteredBrands.length === 0) {
			return (
				<CrudEmptyState
					description="Ajustá los filtros o registrá una marca nueva."
					title="No hay marcas para mostrar"
				/>
			);
		}

		return (
			<BrandTable
				brands={filteredBrands}
				onEdit={(brand) =>
					setFormState({
						open: true,
						mode: "edit",
						entityId: brand.id,
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
			description="Administración de marcas comerciales con baja lógica y bloqueo de eliminación definitiva cuando todavía existen productos asociados."
			title="Marcas"
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
							description: "Incluye marcas eliminadas",
						},
						{
							label: "Activas",
							value: stats.active,
							description: "Disponibles para nuevos productos",
						},
						{
							label: "Inactivas",
							value: stats.inactive,
							description: "No eliminadas, pero fuera de uso",
						},
						{
							label: "Eliminadas",
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
							<FieldLabel htmlFor="brand-search">Buscar</FieldLabel>
							<div className="relative">
								<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-8"
									id="brand-search"
									onChange={(event) => setSearchTerm(event.target.value)}
									placeholder="ID, nombre, descripción o logo"
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
								id="brand-include-deleted"
								onCheckedChange={setIncludeDeleted}
							/>
							<FieldContent>
								<FieldLabel htmlFor="brand-include-deleted">
									Mostrar eliminadas
								</FieldLabel>
								<FieldDescription>Baja lógica</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</div>

				{renderTable()}
			</section>

			<BrandFormDialog
				brand={formMode === "edit" ? brandDetailQuery.data : undefined}
				isLoadingBrand={formMode === "edit" && brandDetailQuery.isFetching}
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
						? `La marca "${softDeleteTarget.name}" quedará eliminada lógicamente e inactiva.`
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
						? `Esta acción intenta borrar la marca "${hardDeleteTarget.name}" de la base de datos. Si todavía hay productos que la referencian, el servidor va a bloquear la operación.`
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
