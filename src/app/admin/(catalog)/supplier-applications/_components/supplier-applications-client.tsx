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
import { Field, FieldLabel } from "~/components/ui/field";
import { Select } from "~/components/ui/select";
import { CrudFilterPanel } from "~/features/admin/crud/_components/crud-filter-panel";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudEmptyState,
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { supplierApplicationStatusOptions } from "~/features/admin/crud/supplier-application/supplier-application.mappers";
import { SupplierApplicationTable } from "~/features/admin/crud/supplier-application/supplier-application-table";
import { SUPPLIER_APPLICATION_LIST_LIMIT } from "~/schemas/admin/supplier-application.schemas";
import type {
	SupplierApplicationListItem,
	SupplierApplicationStatus,
} from "~/shared/common/admin-crud/supplier-application.types";
import { api } from "~/trpc/react";

export function SupplierApplicationsClient() {
	const utils = api.useUtils();
	const [status, setStatus] = useState<SupplierApplicationStatus | "all">(
		"all",
	);
	const [target, setTarget] = useState<SupplierApplicationListItem | null>(
		null,
	);

	const listQuery = api.admin.supplierApplication.list.useQuery({ status });

	const markContactedMutation =
		api.admin.supplierApplication.markContacted.useMutation({
			onSuccess: async () => {
				toast.success("Solicitud marcada como contactada");
				setTarget(null);
				await utils.admin.supplierApplication.list.invalidate();
			},
			onError: async (error) => {
				toast.error(error.message || "No se pudo actualizar la solicitud");
				setTarget(null);
				await utils.admin.supplierApplication.list.invalidate();
			},
		});

	const renderTable = () => {
		if (listQuery.isLoading) return <CrudLoadingState />;
		if (listQuery.isError) {
			return <CrudErrorState message={listQuery.error.message} />;
		}

		const applications = listQuery.data ?? [];
		if (applications.length === 0) {
			return (
				<CrudEmptyState
					description="Las solicitudes llegan desde la página pública Sé proveedor."
					title="No hay solicitudes para mostrar"
				/>
			);
		}

		return (
			<>
				<SupplierApplicationTable
					applications={applications}
					onMarkContacted={setTarget}
				/>
				{applications.length >= SUPPLIER_APPLICATION_LIST_LIMIT ? (
					<p className="text-muted-foreground text-xs">
						Se muestran las primeras {SUPPLIER_APPLICATION_LIST_LIMIT}{" "}
						solicitudes: las sin contactar primero y, dentro de cada grupo, las
						más recientes.
					</p>
				) : null}
			</>
		);
	};

	return (
		<CrudPageShell
			description="Solicitudes de posibles proveedores enviadas desde /proveedores. Marcá cada una como contactada cuando te comuniques; si avanza, el proveedor se crea a mano en Proveedores."
			title="Solicitudes de proveedor"
		>
			<section className="flex flex-col gap-3">
				<CrudFilterPanel
					activeAdvancedCount={0}
					onReset={() => setStatus("all")}
					primary={
						<Field>
							<FieldLabel htmlFor="supplier-application-status">
								Estado
							</FieldLabel>
							<Select
								id="supplier-application-status"
								onChange={(event) =>
									setStatus(
										event.target.value as SupplierApplicationStatus | "all",
									)
								}
								value={status}
							>
								<option value="all">Todas</option>
								{supplierApplicationStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</Select>
						</Field>
					}
				/>

				{renderTable()}
			</section>

			<AlertDialog
				onOpenChange={(open) => {
					if (!open) setTarget(null);
				}}
				open={target !== null}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Marcar como contactada</AlertDialogTitle>
						<AlertDialogDescription>
							{target
								? `La solicitud de "${target.companyName}" quedará registrada como contactada por vos. No se puede deshacer.`
								: null}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={markContactedMutation.isPending}>
							Cancelar
						</AlertDialogCancel>
						<Button
							disabled={markContactedMutation.isPending}
							onClick={() => {
								if (target) markContactedMutation.mutate({ id: target.id });
							}}
						>
							Marcar como contactada
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</CrudPageShell>
	);
}
