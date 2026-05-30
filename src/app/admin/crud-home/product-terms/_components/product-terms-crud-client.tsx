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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
import { ProductClientTermsFormDialog } from "~/features/admin/crud/product-client-terms/product-client-terms-form-dialog";
import { ProductClientTermsTable } from "~/features/admin/crud/product-client-terms/product-client-terms-table";
import { ProductLocalConstraintsFormDialog } from "~/features/admin/crud/product-local-constraints/product-local-constraints-form-dialog";
import { ProductLocalConstraintsTable } from "~/features/admin/crud/product-local-constraints/product-local-constraints-table";
import { ProductSupplierTermsFormDialog } from "~/features/admin/crud/product-supplier-terms/product-supplier-terms-form-dialog";
import { ProductSupplierTermsTable } from "~/features/admin/crud/product-supplier-terms/product-supplier-terms-table";
import type {
	CrudModalState,
	CrudStatusFilter,
} from "~/shared/common/admin-crud/crud.types";
import type {
	ProductClientTermsFormValues,
	ProductClientTermsListItem,
	ProductClientTermsStats,
} from "~/shared/common/admin-crud/product-client-terms.types";
import type {
	ProductLocalConstraintsFormValues,
	ProductLocalConstraintsListItem,
	ProductLocalConstraintsStats,
} from "~/shared/common/admin-crud/product-local-constraints.types";
import type {
	ProductSupplierTermsFormValues,
	ProductSupplierTermsListItem,
	ProductSupplierTermsStats,
} from "~/shared/common/admin-crud/product-supplier-terms.types";
import { api } from "~/trpc/react";

const closedFormState: CrudModalState<number> = {
	open: false,
	mode: null,
	entityId: null,
};

function StatsBlock({
	stats,
	isLoading,
	isError,
	errorMessage,
	totalLabel,
	activeLabel,
	inactiveLabel,
	deletedLabel,
}: {
	stats?:
		| ProductClientTermsStats
		| ProductSupplierTermsStats
		| ProductLocalConstraintsStats;
	isLoading: boolean;
	isError: boolean;
	errorMessage?: string;
	totalLabel: string;
	activeLabel: string;
	inactiveLabel: string;
	deletedLabel: string;
}) {
	if (isLoading) return <CrudLoadingState rows={2} />;

	if (isError) {
		return (
			<CrudErrorState
				message={errorMessage || "No se pudieron cargar los indicadores"}
			/>
		);
	}

	if (!stats) return null;

	return (
		<CrudStatsCards
			stats={[
				{
					label: "Total",
					value: stats.total,
					description: totalLabel,
				},
				{
					label: "Activos",
					value: stats.active,
					description: activeLabel,
				},
				{
					label: "Inactivos",
					value: stats.inactive,
					description: inactiveLabel,
				},
				{
					label: "Eliminados",
					value: stats.deleted,
					description: deletedLabel,
				},
			]}
		/>
	);
}

function FilterBar({
	searchId,
	searchPlaceholder,
	includeDeleted,
	statusFilter,
	searchTerm,
	onIncludeDeletedChange,
	onStatusFilterChange,
	onSearchTermChange,
}: {
	searchId: string;
	searchPlaceholder: string;
	includeDeleted: boolean;
	statusFilter: CrudStatusFilter;
	searchTerm: string;
	onIncludeDeletedChange: (value: boolean) => void;
	onStatusFilterChange: (value: CrudStatusFilter) => void;
	onSearchTermChange: (value: string) => void;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-none border p-3 lg:flex-row lg:items-end lg:justify-between">
			<FieldGroup className="grid flex-1 gap-3 md:grid-cols-[minmax(14rem,1fr)_auto_auto] md:items-end">
				<Field>
					<FieldLabel htmlFor={searchId}>Buscar</FieldLabel>
					<div className="relative">
						<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							className="pl-8"
							id={searchId}
							onChange={(event) => onSearchTermChange(event.target.value)}
							placeholder={searchPlaceholder}
							value={searchTerm}
						/>
					</div>
				</Field>
				<Field>
					<FieldLabel>Estado</FieldLabel>
					<ToggleGroup
						onValueChange={(value) => {
							if (value) onStatusFilterChange(value as CrudStatusFilter);
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
						id={`${searchId}-include-deleted`}
						onCheckedChange={onIncludeDeletedChange}
					/>
					<FieldContent>
						<FieldLabel htmlFor={`${searchId}-include-deleted`}>
							Mostrar eliminados
						</FieldLabel>
						<FieldDescription>Baja logica</FieldDescription>
					</FieldContent>
				</Field>
			</FieldGroup>
		</div>
	);
}

function ProductClientTermsPanel() {
	const utils = api.useUtils();
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [statusFilter, setStatusFilter] = useState<CrudStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [formState, setFormState] =
		useState<CrudModalState<number>>(closedFormState);
	const [softDeleteTarget, setSoftDeleteTarget] =
		useState<ProductClientTermsListItem | null>(null);
	const [hardDeleteTarget, setHardDeleteTarget] =
		useState<ProductClientTermsListItem | null>(null);

	const selectedId =
		formState.open && formState.mode === "edit" ? formState.entityId : null;
	const formMode = formState.mode ?? "create";

	const termsQuery = api.admin.productClientTerms.list.useQuery({
		includeDeleted,
	});
	const statsQuery = api.admin.productClientTerms.getStats.useQuery();
	const productsQuery = api.admin.product.list.useQuery({
		includeDeleted: true,
	});
	const detailQuery = api.admin.productClientTerms.getById.useQuery(
		{ id: selectedId ?? 0 },
		{ enabled: selectedId !== null },
	);

	const invalidateQueries = async () => {
		await Promise.all([
			utils.admin.productClientTerms.list.invalidate(),
			utils.admin.productClientTerms.getStats.invalidate(),
			utils.admin.productClientTerms.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.productClientTerms.create.useMutation({
		onSuccess: async () => {
			toast.success("Terminos de cliente creados");
			setFormState(closedFormState);
			await invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudieron crear los terminos");
		},
	});

	const updateMutation = api.admin.productClientTerms.update.useMutation({
		onSuccess: async () => {
			toast.success("Terminos de cliente actualizados");
			setFormState(closedFormState);
			await invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudieron actualizar los terminos");
		},
	});

	const softDeleteMutation =
		api.admin.productClientTerms.softDelete.useMutation({
			onSuccess: async () => {
				toast.warning("Terminos de cliente enviados a papelera");
				setSoftDeleteTarget(null);
				await invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudieron eliminar los terminos");
			},
		});

	const hardDeleteMutation =
		api.admin.productClientTerms.hardDelete.useMutation({
			onSuccess: async () => {
				toast.success("Terminos de cliente eliminados definitivamente");
				setHardDeleteTarget(null);
				await invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo eliminar definitivamente");
			},
		});

	useEffect(() => {
		if (formState.open && formState.mode === "edit" && detailQuery.isError) {
			toast.error(
				detailQuery.error.message || "No se pudieron cargar los terminos",
			);
			setFormState(closedFormState);
		}
	}, [detailQuery.error, detailQuery.isError, formState.mode, formState.open]);

	const filteredTerms = useMemo(() => {
		const search = normalizeSearch(searchTerm);

		return (termsQuery.data ?? []).filter((terms) => {
			return (
				matchesCrudStatus(statusFilter, terms) &&
				matchesSearch(search, [
					terms.id,
					terms.product.name,
					terms.currency,
					terms.moq,
					terms.moqPrice,
				])
			);
		});
	}, [searchTerm, statusFilter, termsQuery.data]);

	const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (values: ProductClientTermsFormValues) => {
		if (formState.mode === "edit" && formState.entityId !== null) {
			updateMutation.mutate({ id: formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	const renderTable = () => {
		if (termsQuery.isLoading) return <CrudLoadingState />;

		if (termsQuery.isError) {
			return (
				<CrudErrorState
					message={
						termsQuery.error.message ||
						"No se pudo obtener la lista de terminos"
					}
				/>
			);
		}

		if (filteredTerms.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros o agrega terminos de cliente."
					title="No hay terminos de cliente para mostrar"
				/>
			);
		}

		return (
			<ProductClientTermsTable
				onEdit={(terms) =>
					setFormState({
						open: true,
						mode: "edit",
						entityId: terms.id,
					})
				}
				onHardDelete={setHardDeleteTarget}
				onSoftDelete={setSoftDeleteTarget}
				terms={filteredTerms}
			/>
		);
	};

	return (
		<section className="flex flex-col gap-3">
			<div className="flex justify-end">
				<Button
					onClick={() =>
						setFormState({ open: true, mode: "create", entityId: null })
					}
				>
					<PlusIcon data-icon="inline-start" />
					Agregar terminos
				</Button>
			</div>

			<StatsBlock
				activeLabel="Disponibles para ventas nuevas"
				deletedLabel="Baja logica aplicada"
				errorMessage={statsQuery.error?.message}
				inactiveLabel="No eliminados, pero fuera de uso"
				isError={statsQuery.isError}
				isLoading={statsQuery.isLoading}
				stats={statsQuery.data}
				totalLabel="Incluye terminos eliminados"
			/>

			<FilterBar
				includeDeleted={includeDeleted}
				onIncludeDeletedChange={setIncludeDeleted}
				onSearchTermChange={setSearchTerm}
				onStatusFilterChange={setStatusFilter}
				searchId="product-client-terms-search"
				searchPlaceholder="ID, producto, moneda o precio"
				searchTerm={searchTerm}
				statusFilter={statusFilter}
			/>

			{renderTable()}

			<ProductClientTermsFormDialog
				isLoadingProducts={productsQuery.isLoading}
				isLoadingTerms={formMode === "edit" && detailQuery.isFetching}
				isSubmitting={isFormSubmitting}
				mode={formMode}
				onOpenChange={(open) => {
					if (!open) setFormState(closedFormState);
				}}
				onSubmit={handleSubmit}
				open={formState.open}
				products={productsQuery.data ?? []}
				terms={formMode === "edit" ? detailQuery.data : undefined}
			/>

			<CrudDeleteDialog
				confirmLabel="Enviar a papelera"
				description={
					softDeleteTarget
						? `Los terminos de cliente #${softDeleteTarget.id} quedaran eliminados logicamente e inactivos.`
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
						? `Escribi "${hardDeleteTarget.id}" para confirmar`
						: "Confirmacion"
				}
				confirmationValue={
					hardDeleteTarget ? String(hardDeleteTarget.id) : undefined
				}
				confirmLabel="Eliminar definitivamente"
				description={
					hardDeleteTarget
						? "Esta accion intenta borrar los terminos. Si tienen cart items relacionados, el servidor la va a bloquear."
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
		</section>
	);
}

function ProductSupplierTermsPanel() {
	const utils = api.useUtils();
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [statusFilter, setStatusFilter] = useState<CrudStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [formState, setFormState] =
		useState<CrudModalState<number>>(closedFormState);
	const [softDeleteTarget, setSoftDeleteTarget] =
		useState<ProductSupplierTermsListItem | null>(null);
	const [hardDeleteTarget, setHardDeleteTarget] =
		useState<ProductSupplierTermsListItem | null>(null);

	const selectedId =
		formState.open && formState.mode === "edit" ? formState.entityId : null;
	const formMode = formState.mode ?? "create";

	const termsQuery = api.admin.productSupplierTerms.list.useQuery({
		includeDeleted,
	});
	const statsQuery = api.admin.productSupplierTerms.getStats.useQuery();
	const productsQuery = api.admin.product.list.useQuery({
		includeDeleted: true,
	});
	const suppliersQuery = api.admin.supplier.list.useQuery({
		includeDeleted: true,
	});
	const detailQuery = api.admin.productSupplierTerms.getById.useQuery(
		{ id: selectedId ?? 0 },
		{ enabled: selectedId !== null },
	);

	const invalidateQueries = async () => {
		await Promise.all([
			utils.admin.productSupplierTerms.list.invalidate(),
			utils.admin.productSupplierTerms.getStats.invalidate(),
			utils.admin.productSupplierTerms.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.productSupplierTerms.create.useMutation({
		onSuccess: async () => {
			toast.success("Terminos de proveedor creados");
			setFormState(closedFormState);
			await invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudieron crear los terminos");
		},
	});

	const updateMutation = api.admin.productSupplierTerms.update.useMutation({
		onSuccess: async () => {
			toast.success("Terminos de proveedor actualizados");
			setFormState(closedFormState);
			await invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudieron actualizar los terminos");
		},
	});

	const softDeleteMutation =
		api.admin.productSupplierTerms.softDelete.useMutation({
			onSuccess: async () => {
				toast.warning("Terminos de proveedor enviados a papelera");
				setSoftDeleteTarget(null);
				await invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudieron eliminar los terminos");
			},
		});

	const hardDeleteMutation =
		api.admin.productSupplierTerms.hardDelete.useMutation({
			onSuccess: async () => {
				toast.success("Terminos de proveedor eliminados definitivamente");
				setHardDeleteTarget(null);
				await invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo eliminar definitivamente");
			},
		});

	useEffect(() => {
		if (formState.open && formState.mode === "edit" && detailQuery.isError) {
			toast.error(
				detailQuery.error.message || "No se pudieron cargar los terminos",
			);
			setFormState(closedFormState);
		}
	}, [detailQuery.error, detailQuery.isError, formState.mode, formState.open]);

	const filteredTerms = useMemo(() => {
		const search = normalizeSearch(searchTerm);

		return (termsQuery.data ?? []).filter((terms) => {
			return (
				matchesCrudStatus(statusFilter, terms) &&
				matchesSearch(search, [
					terms.id,
					terms.product.name,
					terms.supplier.name,
					terms.currency,
					terms.moq,
					terms.moqPrice,
				])
			);
		});
	}, [searchTerm, statusFilter, termsQuery.data]);

	const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (values: ProductSupplierTermsFormValues) => {
		if (formState.mode === "edit" && formState.entityId !== null) {
			updateMutation.mutate({ id: formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	const renderTable = () => {
		if (termsQuery.isLoading) return <CrudLoadingState />;

		if (termsQuery.isError) {
			return (
				<CrudErrorState
					message={
						termsQuery.error.message ||
						"No se pudo obtener la lista de terminos"
					}
				/>
			);
		}

		if (filteredTerms.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros o agrega terminos de proveedor."
					title="No hay terminos de proveedor para mostrar"
				/>
			);
		}

		return (
			<ProductSupplierTermsTable
				onEdit={(terms) =>
					setFormState({
						open: true,
						mode: "edit",
						entityId: terms.id,
					})
				}
				onHardDelete={setHardDeleteTarget}
				onSoftDelete={setSoftDeleteTarget}
				terms={filteredTerms}
			/>
		);
	};

	return (
		<section className="flex flex-col gap-3">
			<div className="flex justify-end">
				<Button
					onClick={() =>
						setFormState({ open: true, mode: "create", entityId: null })
					}
				>
					<PlusIcon data-icon="inline-start" />
					Agregar terminos
				</Button>
			</div>

			<StatsBlock
				activeLabel="Disponibles para compras nuevas"
				deletedLabel="Baja logica aplicada"
				errorMessage={statsQuery.error?.message}
				inactiveLabel="No eliminados, pero fuera de uso"
				isError={statsQuery.isError}
				isLoading={statsQuery.isLoading}
				stats={statsQuery.data}
				totalLabel="Incluye terminos eliminados"
			/>

			<FilterBar
				includeDeleted={includeDeleted}
				onIncludeDeletedChange={setIncludeDeleted}
				onSearchTermChange={setSearchTerm}
				onStatusFilterChange={setStatusFilter}
				searchId="product-supplier-terms-search"
				searchPlaceholder="ID, producto, proveedor o precio"
				searchTerm={searchTerm}
				statusFilter={statusFilter}
			/>

			{renderTable()}

			<ProductSupplierTermsFormDialog
				isLoadingProducts={productsQuery.isLoading}
				isLoadingSuppliers={suppliersQuery.isLoading}
				isLoadingTerms={formMode === "edit" && detailQuery.isFetching}
				isSubmitting={isFormSubmitting}
				mode={formMode}
				onOpenChange={(open) => {
					if (!open) setFormState(closedFormState);
				}}
				onSubmit={handleSubmit}
				open={formState.open}
				products={productsQuery.data ?? []}
				suppliers={suppliersQuery.data ?? []}
				terms={formMode === "edit" ? detailQuery.data : undefined}
			/>

			<CrudDeleteDialog
				confirmLabel="Enviar a papelera"
				description={
					softDeleteTarget
						? `Los terminos de proveedor #${softDeleteTarget.id} quedaran eliminados logicamente e inactivos.`
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
						? `Escribi "${hardDeleteTarget.id}" para confirmar`
						: "Confirmacion"
				}
				confirmationValue={
					hardDeleteTarget ? String(hardDeleteTarget.id) : undefined
				}
				confirmLabel="Eliminar definitivamente"
				description={
					hardDeleteTarget
						? "Esta accion intenta borrar los terminos. Si tienen lot items relacionados, el servidor la va a bloquear."
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
		</section>
	);
}

function ProductLocalConstraintsPanel() {
	const utils = api.useUtils();
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [statusFilter, setStatusFilter] = useState<CrudStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [formState, setFormState] =
		useState<CrudModalState<number>>(closedFormState);
	const [softDeleteTarget, setSoftDeleteTarget] =
		useState<ProductLocalConstraintsListItem | null>(null);
	const [hardDeleteTarget, setHardDeleteTarget] =
		useState<ProductLocalConstraintsListItem | null>(null);

	const selectedId =
		formState.open && formState.mode === "edit" ? formState.entityId : null;
	const formMode = formState.mode ?? "create";

	const constraintsQuery = api.admin.productLocalConstraints.list.useQuery({
		includeDeleted,
	});
	const statsQuery = api.admin.productLocalConstraints.getStats.useQuery();
	const productsQuery = api.admin.product.list.useQuery({
		includeDeleted: true,
	});
	const detailQuery = api.admin.productLocalConstraints.getById.useQuery(
		{ id: selectedId ?? 0 },
		{ enabled: selectedId !== null },
	);

	const invalidateQueries = async () => {
		await Promise.all([
			utils.admin.productLocalConstraints.list.invalidate(),
			utils.admin.productLocalConstraints.getStats.invalidate(),
			utils.admin.productLocalConstraints.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.productLocalConstraints.create.useMutation({
		onSuccess: async () => {
			toast.success("Restriccion local creada");
			setFormState(closedFormState);
			await invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear la restriccion");
		},
	});

	const updateMutation = api.admin.productLocalConstraints.update.useMutation({
		onSuccess: async () => {
			toast.success("Restriccion local actualizada");
			setFormState(closedFormState);
			await invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar la restriccion");
		},
	});

	const softDeleteMutation =
		api.admin.productLocalConstraints.softDelete.useMutation({
			onSuccess: async () => {
				toast.warning("Restriccion local enviada a papelera");
				setSoftDeleteTarget(null);
				await invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo eliminar la restriccion");
			},
		});

	const hardDeleteMutation =
		api.admin.productLocalConstraints.hardDelete.useMutation({
			onSuccess: async () => {
				toast.success("Restriccion local eliminada definitivamente");
				setHardDeleteTarget(null);
				await invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo eliminar definitivamente");
			},
		});

	useEffect(() => {
		if (formState.open && formState.mode === "edit" && detailQuery.isError) {
			toast.error(
				detailQuery.error.message || "No se pudo cargar la restriccion",
			);
			setFormState(closedFormState);
		}
	}, [detailQuery.error, detailQuery.isError, formState.mode, formState.open]);

	const filteredConstraints = useMemo(() => {
		const search = normalizeSearch(searchTerm);

		return (constraintsQuery.data ?? []).filter((constraint) => {
			return (
				matchesCrudStatus(statusFilter, constraint) &&
				matchesSearch(search, [
					constraint.id,
					constraint.product.name,
					constraint.constraintType,
					constraint.reason,
				])
			);
		});
	}, [constraintsQuery.data, searchTerm, statusFilter]);

	const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = (values: ProductLocalConstraintsFormValues) => {
		if (formState.mode === "edit" && formState.entityId !== null) {
			updateMutation.mutate({ id: formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	const renderTable = () => {
		if (constraintsQuery.isLoading) return <CrudLoadingState />;

		if (constraintsQuery.isError) {
			return (
				<CrudErrorState
					message={
						constraintsQuery.error.message ||
						"No se pudo obtener la lista de restricciones"
					}
				/>
			);
		}

		if (filteredConstraints.length === 0) {
			return (
				<CrudEmptyState
					description="Ajusta los filtros o agrega una restriccion local."
					title="No hay restricciones locales para mostrar"
				/>
			);
		}

		return (
			<ProductLocalConstraintsTable
				constraints={filteredConstraints}
				onEdit={(constraint) =>
					setFormState({
						open: true,
						mode: "edit",
						entityId: constraint.id,
					})
				}
				onHardDelete={setHardDeleteTarget}
				onSoftDelete={setSoftDeleteTarget}
			/>
		);
	};

	return (
		<section className="flex flex-col gap-3">
			<div className="flex justify-end">
				<Button
					onClick={() =>
						setFormState({ open: true, mode: "create", entityId: null })
					}
				>
					<PlusIcon data-icon="inline-start" />
					Agregar restriccion
				</Button>
			</div>

			<StatsBlock
				activeLabel="Disponibles para validaciones nuevas"
				deletedLabel="Baja logica aplicada"
				errorMessage={statsQuery.error?.message}
				inactiveLabel="No eliminadas, pero fuera de uso"
				isError={statsQuery.isError}
				isLoading={statsQuery.isLoading}
				stats={statsQuery.data}
				totalLabel="Incluye restricciones eliminadas"
			/>

			<FilterBar
				includeDeleted={includeDeleted}
				onIncludeDeletedChange={setIncludeDeleted}
				onSearchTermChange={setSearchTerm}
				onStatusFilterChange={setStatusFilter}
				searchId="product-local-constraints-search"
				searchPlaceholder="ID, producto, tipo o motivo"
				searchTerm={searchTerm}
				statusFilter={statusFilter}
			/>

			{renderTable()}

			<ProductLocalConstraintsFormDialog
				constraint={formMode === "edit" ? detailQuery.data : undefined}
				isLoadingConstraint={formMode === "edit" && detailQuery.isFetching}
				isLoadingProducts={productsQuery.isLoading}
				isSubmitting={isFormSubmitting}
				mode={formMode}
				onOpenChange={(open) => {
					if (!open) setFormState(closedFormState);
				}}
				onSubmit={handleSubmit}
				open={formState.open}
				products={productsQuery.data ?? []}
			/>

			<CrudDeleteDialog
				confirmLabel="Enviar a papelera"
				description={
					softDeleteTarget
						? `La restriccion #${softDeleteTarget.id} quedara eliminada logicamente e inactiva.`
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
						? `Escribi "${hardDeleteTarget.id}" para confirmar`
						: "Confirmacion"
				}
				confirmationValue={
					hardDeleteTarget ? String(hardDeleteTarget.id) : undefined
				}
				confirmLabel="Eliminar definitivamente"
				description={
					hardDeleteTarget
						? "Esta accion borra la restriccion local de la base de datos."
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
		</section>
	);
}

export function ProductTermsCrudClient() {
	return (
		<CrudPageShell
			description="Administracion de terminos comerciales y restricciones locales de producto en una vista agrupada."
			title="Terminos y restricciones de producto"
		>
			<Tabs defaultValue="client">
				<TabsList className="flex w-full overflow-x-auto">
					<TabsTrigger value="client">Cliente</TabsTrigger>
					<TabsTrigger value="supplier">Proveedor</TabsTrigger>
					<TabsTrigger value="constraints">Restricciones</TabsTrigger>
				</TabsList>
				<TabsContent value="client">
					<ProductClientTermsPanel />
				</TabsContent>
				<TabsContent value="supplier">
					<ProductSupplierTermsPanel />
				</TabsContent>
				<TabsContent value="constraints">
					<ProductLocalConstraintsPanel />
				</TabsContent>
			</Tabs>
		</CrudPageShell>
	);
}
