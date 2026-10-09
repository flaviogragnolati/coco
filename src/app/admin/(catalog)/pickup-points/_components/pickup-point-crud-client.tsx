"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { CrudEntityPage } from "~/features/admin/crud/_components/crud-entity-page";
import type { CrudEntityCopy } from "~/features/admin/crud/_lib/crud-entity-copy";
import { useCrudEntityPage } from "~/features/admin/crud/_lib/use-crud-entity-page";
import { useCrudPageState } from "~/features/admin/crud/_lib/use-crud-page-state";
import { deactivationDescription } from "~/features/admin/crud/pickup-point/pickup-point.mappers";
import { PickupPointFormDialog } from "~/features/admin/crud/pickup-point/pickup-point-form-dialog";
import { PickupPointTable } from "~/features/admin/crud/pickup-point/pickup-point-table";
import type {
	PickupPointFormValues,
	PickupPointListItem,
} from "~/shared/common/admin-crud/pickup-point.types";
import { api } from "~/trpc/react";

const pickupPointSearchFields = (point: PickupPointListItem) => [
	point.id,
	point.name,
	point.line1,
	point.city,
	point.hours,
];

const pickupPointCopy: CrudEntityCopy<PickupPointListItem> = {
	idPrefix: "pickup-point",
	pageShell: {
		title: "Puntos de retiro",
		description:
			"Lugares donde llegan los envíos y cada cliente retira su paquete. El checkout ofrece los activos.",
	},
	createButtonLabel: "Agregar nuevo",
	searchPlaceholder: "ID, nombre, dirección u horarios",
	statusLabels: { active: "Activos", inactive: "Inactivos" },
	stats: {
		total: { label: "Total", description: "Incluye puntos eliminados" },
		active: { label: "Activos", description: "Ofrecidos en el checkout" },
		inactive: {
			label: "Inactivos",
			description: "Siguen sirviendo a sus pedidos, no se ofrecen",
		},
		deleted: { label: "Eliminados", description: "Baja lógica aplicada" },
	},
	includeDeletedLabel: "Mostrar eliminados",
	includeDeletedHint: "Baja lógica",
	listErrorMessage: "No se pudo obtener la lista de puntos de retiro",
	statsErrorMessage: "No se pudieron cargar los indicadores",
	detailErrorMessage: "No se pudo cargar el punto de retiro",
	empty: {
		title: "No hay puntos de retiro para mostrar",
		description: "Ajustá los filtros o agregá un punto nuevo.",
	},
	softDelete: {
		title: "Confirmar baja lógica",
		confirmLabel: "Enviar a papelera",
		describe: (point) =>
			`El punto "${point.name}" quedará eliminado lógicamente e inactivo. ${deactivationDescription(point)}`,
	},
	hardDelete: {
		title: "Eliminación definitiva",
		confirmLabel: "Eliminar definitivamente",
		describe: (point) =>
			`Esta acción intenta borrar el punto "${point.name}" de la base de datos. Si algún pedido o envío lo usa, el servidor la va a bloquear.`,
		confirmationValue: (point) => point.name,
		confirmationLabel: (point) => `Escribí "${point.name}" para confirmar`,
	},
};

export function PickupPointCrudClient() {
	const utils = api.useUtils();
	const state = useCrudPageState<number, PickupPointListItem>();
	const [toggleTarget, setToggleTarget] = useState<PickupPointListItem | null>(
		null,
	);

	const listQuery = api.admin.pickupPoint.list.useQuery({
		includeDeleted: state.includeDeleted,
	});
	const statsQuery = api.admin.pickupPoint.getStats.useQuery();
	const detailQuery = api.admin.pickupPoint.getById.useQuery(
		{ id: state.selectedId ?? 0 },
		{ enabled: state.selectedId !== null },
	);

	const invalidate = async () => {
		await Promise.all([
			utils.admin.pickupPoint.list.invalidate(),
			utils.admin.pickupPoint.getStats.invalidate(),
			utils.admin.pickupPoint.getById.invalidate(),
		]);
	};

	const createMutation = api.admin.pickupPoint.create.useMutation({
		onSuccess: async () => {
			toast.success("Punto de retiro creado");
			state.closeForm();
			await invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el punto de retiro");
		},
	});

	const updateMutation = api.admin.pickupPoint.update.useMutation({
		onSuccess: async () => {
			toast.success("Punto de retiro actualizado");
			state.closeForm();
			await invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el punto de retiro");
		},
	});

	const setActiveMutation = api.admin.pickupPoint.setActive.useMutation({
		onSuccess: async (point) => {
			toast.success(
				point.active
					? "Punto de retiro activado"
					: "Punto de retiro desactivado",
			);
			setToggleTarget(null);
			await invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo cambiar el estado");
		},
	});

	const softDeleteMutation = api.admin.pickupPoint.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Punto de retiro enviado a papelera");
			state.setSoftDeleteTarget(null);
			await invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el punto de retiro");
		},
	});

	const hardDeleteMutation = api.admin.pickupPoint.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Punto de retiro eliminado definitivamente");
			state.setHardDeleteTarget(null);
			await invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	const page = useCrudEntityPage({
		state,
		listQuery,
		detailQuery,
		createMutation,
		updateMutation,
		searchFields: pickupPointSearchFields,
		detailErrorMessage: pickupPointCopy.detailErrorMessage,
	});

	const handleSubmit = (values: PickupPointFormValues) => {
		if (state.formState.mode === "edit" && state.formState.entityId !== null) {
			updateMutation.mutate({ id: state.formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	const deactivating = toggleTarget?.active ?? false;

	return (
		<CrudEntityPage
			copy={pickupPointCopy}
			extras={
				<AlertDialog
					onOpenChange={(open) => {
						if (!open) setToggleTarget(null);
					}}
					open={toggleTarget !== null}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{deactivating
									? `Desactivar "${toggleTarget?.name}"`
									: `Activar "${toggleTarget?.name}"`}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{toggleTarget
									? deactivating
										? deactivationDescription(toggleTarget)
										: "El checkout lo vuelve a ofrecer enseguida."
									: null}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={setActiveMutation.isPending}>
								Cancelar
							</AlertDialogCancel>
							<Button
								disabled={setActiveMutation.isPending}
								onClick={() => {
									if (!toggleTarget) return;
									setActiveMutation.mutate({
										id: toggleTarget.id,
										active: !toggleTarget.active,
									});
								}}
								variant={deactivating ? "destructive" : "default"}
							>
								{deactivating ? "Desactivar" : "Activar"}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			}
			filteredItems={page.filteredItems}
			hardDelete={{
				isPending: hardDeleteMutation.isPending,
				onConfirm: (point) => hardDeleteMutation.mutate({ id: point.id }),
			}}
			listQuery={listQuery}
			renderFormDialog={() => (
				<PickupPointFormDialog
					isLoadingPickupPoint={page.isLoadingDetail}
					isSubmitting={page.isFormSubmitting}
					mode={state.formMode}
					onOpenChange={(open) => {
						if (!open) state.closeForm();
					}}
					onSubmit={handleSubmit}
					open={state.formState.open}
					pickupPoint={page.detail}
				/>
			)}
			renderTable={() => (
				<PickupPointTable
					onEdit={(point) => state.openEdit(point.id)}
					onHardDelete={state.setHardDeleteTarget}
					onSoftDelete={state.setSoftDeleteTarget}
					onToggleActive={setToggleTarget}
					pickupPoints={page.filteredItems}
				/>
			)}
			softDelete={{
				isPending: softDeleteMutation.isPending,
				onConfirm: (point) => softDeleteMutation.mutate({ id: point.id }),
			}}
			state={state}
			statsQuery={statsQuery}
		/>
	);
}
