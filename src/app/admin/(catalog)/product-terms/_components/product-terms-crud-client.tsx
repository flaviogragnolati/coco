"use client";

import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CrudEntityPage } from "~/features/admin/crud/_components/crud-entity-page";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import type { CrudEntityCopy } from "~/features/admin/crud/_lib/crud-entity-copy";
import { useCrudEntityPage } from "~/features/admin/crud/_lib/use-crud-entity-page";
import { useCrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import { ProductClientTermsFormDialog } from "~/features/admin/crud/product-client-terms/product-client-terms-form-dialog";
import { ProductClientTermsTable } from "~/features/admin/crud/product-client-terms/product-client-terms-table";
import { ProductLocalConstraintsFormDialog } from "~/features/admin/crud/product-local-constraints/product-local-constraints-form-dialog";
import { ProductLocalConstraintsTable } from "~/features/admin/crud/product-local-constraints/product-local-constraints-table";
import { ProductSupplierTermsFormDialog } from "~/features/admin/crud/product-supplier-terms/product-supplier-terms-form-dialog";
import { ProductSupplierTermsTable } from "~/features/admin/crud/product-supplier-terms/product-supplier-terms-table";
import type {
	ProductClientTermsFormValues,
	ProductClientTermsListItem,
} from "~/shared/common/admin-crud/product-client-terms.types";
import type {
	ProductLocalConstraintsFormValues,
	ProductLocalConstraintsListItem,
} from "~/shared/common/admin-crud/product-local-constraints.types";
import type {
	ProductSupplierTermsFormValues,
	ProductSupplierTermsListItem,
} from "~/shared/common/admin-crud/product-supplier-terms.types";
import { api } from "~/trpc/react";

const clientTermsSearchFields = (terms: ProductClientTermsListItem) => [
	terms.id,
	terms.product.name,
	terms.currency,
	terms.moq,
	terms.moqPrice,
];

// The three panels' hard-delete wording tracks each service's relation guard:
// client terms block on cartItems, supplier terms on lotItems, and local
// constraints have no guard at all. The differences are intentional.
const clientTermsCopy: CrudEntityCopy<ProductClientTermsListItem> = {
	idPrefix: "product-client-terms",
	includeDeletedId: "product-client-terms-search-include-deleted",
	createButtonLabel: "Agregar términos",
	searchPlaceholder: "ID, producto, moneda o precio",
	statusLabels: { active: "Activos", inactive: "Inactivos" },
	stats: {
		total: { label: "Total", description: "Incluye términos eliminados" },
		active: { label: "Activos", description: "Disponibles para ventas nuevas" },
		inactive: {
			label: "Inactivos",
			description: "No eliminados, pero fuera de uso",
		},
		deleted: { label: "Eliminados", description: "Baja logica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminados",
	includeDeletedHint: "Baja logica",
	listErrorMessage: "No se pudo obtener la lista de términos",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudieron cargar los términos",
	empty: {
		title: "No hay términos de cliente para mostrar",
		description: "Ajusta los filtros o agrega términos de cliente.",
	},
	softDelete: {
		title: "Confirmar baja logica",
		confirmLabel: "Enviar a papelera",
		describe: (terms) =>
			`Los términos de cliente #${terms.id} quedaran eliminados logicamente e inactivos.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: () =>
			"Esta acción intenta borrar los términos. Si tienen cart items relacionados, el servidor la va a bloquear.",
		confirmationValue: (terms) => String(terms.id),
		confirmationLabel: (terms) => `Escribi "${terms.id}" para confirmar`,
	},
};

const supplierTermsSearchFields = (terms: ProductSupplierTermsListItem) => [
	terms.id,
	terms.product.name,
	terms.supplier.name,
	terms.currency,
	terms.moq,
	terms.moqPrice,
];

const supplierTermsCopy: CrudEntityCopy<ProductSupplierTermsListItem> = {
	idPrefix: "product-supplier-terms",
	includeDeletedId: "product-supplier-terms-search-include-deleted",
	createButtonLabel: "Agregar términos",
	searchPlaceholder: "ID, producto, proveedor o precio",
	statusLabels: { active: "Activos", inactive: "Inactivos" },
	stats: {
		total: { label: "Total", description: "Incluye términos eliminados" },
		active: {
			label: "Activos",
			description: "Disponibles para compras nuevas",
		},
		inactive: {
			label: "Inactivos",
			description: "No eliminados, pero fuera de uso",
		},
		deleted: { label: "Eliminados", description: "Baja logica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminados",
	includeDeletedHint: "Baja logica",
	listErrorMessage: "No se pudo obtener la lista de términos",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudieron cargar los términos",
	empty: {
		title: "No hay términos de proveedor para mostrar",
		description: "Ajusta los filtros o agrega términos de proveedor.",
	},
	softDelete: {
		title: "Confirmar baja logica",
		confirmLabel: "Enviar a papelera",
		describe: (terms) =>
			`Los términos de proveedor #${terms.id} quedaran eliminados logicamente e inactivos.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: () =>
			"Esta acción intenta borrar los términos. Si tienen lot items relacionados, el servidor la va a bloquear.",
		confirmationValue: (terms) => String(terms.id),
		confirmationLabel: (terms) => `Escribi "${terms.id}" para confirmar`,
	},
};

const localConstraintsSearchFields = (
	constraint: ProductLocalConstraintsListItem,
) => [
	constraint.id,
	constraint.product.name,
	constraint.constraintType,
	constraint.reason,
];

const localConstraintsCopy: CrudEntityCopy<ProductLocalConstraintsListItem> = {
	idPrefix: "product-local-constraints",
	includeDeletedId: "product-local-constraints-search-include-deleted",
	createButtonLabel: "Agregar restriccion",
	searchPlaceholder: "ID, producto, tipo o motivo",
	statusLabels: { active: "Activos", inactive: "Inactivos" },
	stats: {
		total: { label: "Total", description: "Incluye restricciones eliminadas" },
		active: {
			label: "Activos",
			description: "Disponibles para validaciones nuevas",
		},
		inactive: {
			label: "Inactivos",
			description: "No eliminadas, pero fuera de uso",
		},
		deleted: { label: "Eliminados", description: "Baja logica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminados",
	includeDeletedHint: "Baja logica",
	listErrorMessage: "No se pudo obtener la lista de restricciones",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar la restriccion",
	empty: {
		title: "No hay restricciones locales para mostrar",
		description: "Ajusta los filtros o agrega una restriccion local.",
	},
	softDelete: {
		title: "Confirmar baja logica",
		confirmLabel: "Enviar a papelera",
		describe: (constraint) =>
			`La restriccion #${constraint.id} quedara eliminada logicamente e inactiva.`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: () =>
			"Esta acción borra la restriccion local de la base de datos.",
		confirmationValue: (constraint) => String(constraint.id),
		confirmationLabel: (constraint) =>
			`Escribi "${constraint.id}" para confirmar`,
	},
};

function ProductClientTermsPanel() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, ProductClientTermsListItem>();

	const termsQuery = api.admin.productClientTerms.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.productClientTerms.getStats.useQuery();
	const productsQuery = api.admin.product.list.useQuery({
		includeDeleted: true,
	});
	const detailQuery = api.admin.productClientTerms.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
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
			toast.success("Términos de cliente creados");
			state.closeForm();
			await invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudieron crear los términos");
		},
	});

	const updateMutation = api.admin.productClientTerms.update.useMutation({
		onSuccess: async () => {
			toast.success("Términos de cliente actualizados");
			state.closeForm();
			await invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudieron actualizar los términos");
		},
	});

	const softDeleteMutation =
		api.admin.productClientTerms.softDelete.useMutation({
			onSuccess: async () => {
				toast.warning("Términos de cliente enviados a papelera");
				state.setSoftDeleteTarget(null);
				await invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudieron eliminar los términos");
			},
		});

	const hardDeleteMutation =
		api.admin.productClientTerms.hardDelete.useMutation({
			onSuccess: async () => {
				toast.success("Términos de cliente eliminados definitivamente");
				state.setHardDeleteTarget(null);
				await invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo eliminar definitivamente");
			},
		});

	const page = useCrudEntityPage({
		state,
		listQuery: termsQuery,
		detailQuery,
		createMutation,
		updateMutation,
		searchFields: clientTermsSearchFields,
		detailErrorMessage: clientTermsCopy.detailErrorMessage,
	});

	const handleSubmit = (values: ProductClientTermsFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	return (
		<CrudEntityPage
			copy={clientTermsCopy}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (terms) => hardDeleteMutation.mutate({ id: terms.id }),
			}}
			listQuery={termsQuery}
			renderFormDialog={() => (
				<ProductClientTermsFormDialog
					isLoadingProducts={productsQuery.isLoading}
					isLoadingTerms={page.isLoadingDetail}
					isSubmitting={page.isFormSubmitting}
					mode={state.formMode}
					onOpenChange={(open) => {
						if (!open) state.closeForm();
					}}
					onSubmit={handleSubmit}
					open={state.formState.open}
					products={productsQuery.data ?? []}
					terms={page.detail}
				/>
			)}
			renderTable={() => (
				<ProductClientTermsTable
					onEdit={(terms) => state.openEdit(terms.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
					terms={page.filteredItems}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (terms) => softDeleteMutation.mutate({ id: terms.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}

function ProductSupplierTermsPanel() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, ProductSupplierTermsListItem>();

	const termsQuery = api.admin.productSupplierTerms.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.productSupplierTerms.getStats.useQuery();
	const productsQuery = api.admin.product.list.useQuery({
		includeDeleted: true,
	});
	const suppliersQuery = api.admin.supplier.list.useQuery({
		includeDeleted: true,
	});
	const detailQuery = api.admin.productSupplierTerms.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
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
			toast.success("Términos de proveedor creados");
			state.closeForm();
			await invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudieron crear los términos");
		},
	});

	const updateMutation = api.admin.productSupplierTerms.update.useMutation({
		onSuccess: async () => {
			toast.success("Términos de proveedor actualizados");
			state.closeForm();
			await invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudieron actualizar los términos");
		},
	});

	const softDeleteMutation =
		api.admin.productSupplierTerms.softDelete.useMutation({
			onSuccess: async () => {
				toast.warning("Términos de proveedor enviados a papelera");
				state.setSoftDeleteTarget(null);
				await invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudieron eliminar los términos");
			},
		});

	const hardDeleteMutation =
		api.admin.productSupplierTerms.hardDelete.useMutation({
			onSuccess: async () => {
				toast.success("Términos de proveedor eliminados definitivamente");
				state.setHardDeleteTarget(null);
				await invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo eliminar definitivamente");
			},
		});

	const page = useCrudEntityPage({
		state,
		listQuery: termsQuery,
		detailQuery,
		createMutation,
		updateMutation,
		searchFields: supplierTermsSearchFields,
		detailErrorMessage: supplierTermsCopy.detailErrorMessage,
	});

	const handleSubmit = (values: ProductSupplierTermsFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	return (
		<CrudEntityPage
			copy={supplierTermsCopy}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (terms) => hardDeleteMutation.mutate({ id: terms.id }),
			}}
			listQuery={termsQuery}
			renderFormDialog={() => (
				<ProductSupplierTermsFormDialog
					isLoadingProducts={productsQuery.isLoading}
					isLoadingSuppliers={suppliersQuery.isLoading}
					isLoadingTerms={page.isLoadingDetail}
					isSubmitting={page.isFormSubmitting}
					mode={state.formMode}
					onOpenChange={(open) => {
						if (!open) state.closeForm();
					}}
					onSubmit={handleSubmit}
					open={state.formState.open}
					products={productsQuery.data ?? []}
					suppliers={suppliersQuery.data ?? []}
					terms={page.detail}
				/>
			)}
			renderTable={() => (
				<ProductSupplierTermsTable
					onEdit={(terms) => state.openEdit(terms.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
					terms={page.filteredItems}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (terms) => softDeleteMutation.mutate({ id: terms.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}

function ProductLocalConstraintsPanel() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, ProductLocalConstraintsListItem>();

	const constraintsQuery = api.admin.productLocalConstraints.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.productLocalConstraints.getStats.useQuery();
	const productsQuery = api.admin.product.list.useQuery({
		includeDeleted: true,
	});
	const detailQuery = api.admin.productLocalConstraints.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
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
			state.closeForm();
			await invalidateQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear la restriccion");
		},
	});

	const updateMutation = api.admin.productLocalConstraints.update.useMutation({
		onSuccess: async () => {
			toast.success("Restriccion local actualizada");
			state.closeForm();
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
				state.setSoftDeleteTarget(null);
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
				state.setHardDeleteTarget(null);
				await invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo eliminar definitivamente");
			},
		});

	const page = useCrudEntityPage({
		state,
		listQuery: constraintsQuery,
		detailQuery,
		createMutation,
		updateMutation,
		searchFields: localConstraintsSearchFields,
		detailErrorMessage: localConstraintsCopy.detailErrorMessage,
	});

	const handleSubmit = (values: ProductLocalConstraintsFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	return (
		<CrudEntityPage
			copy={localConstraintsCopy}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (constraint) =>
					hardDeleteMutation.mutate({ id: constraint.id }),
			}}
			listQuery={constraintsQuery}
			renderFormDialog={() => (
				<ProductLocalConstraintsFormDialog
					constraint={page.detail}
					isLoadingConstraint={page.isLoadingDetail}
					isLoadingProducts={productsQuery.isLoading}
					isSubmitting={page.isFormSubmitting}
					mode={state.formMode}
					onOpenChange={(open) => {
						if (!open) state.closeForm();
					}}
					onSubmit={handleSubmit}
					open={state.formState.open}
					products={productsQuery.data ?? []}
				/>
			)}
			renderTable={() => (
				<ProductLocalConstraintsTable
					constraints={page.filteredItems}
					onEdit={(constraint) => state.openEdit(constraint.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (constraint) =>
					softDeleteMutation.mutate({ id: constraint.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}

export function ProductTermsCrudClient() {
	return (
		<CrudPageShell
			description="Administración de términos comerciales y restricciones locales de producto en una vista agrupada."
			title="Términos de producto"
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
