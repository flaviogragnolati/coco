"use client";

import {
	CheckCircle2Icon,
	CircleDashedIcon,
	ListChecksIcon,
	PlusIcon,
	SearchIcon,
	XCircleIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import type { ComboboxOption } from "~/components/ui/combobox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { CrudDeleteDialog } from "~/features/admin/crud/_components/crud-delete-dialog";
import { CrudFilterPanel } from "~/features/admin/crud/_components/crud-filter-panel";
import { CrudPageShell } from "~/features/admin/crud/_components/crud-page-shell";
import {
	CrudEmptyState,
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { CrudStatsCards } from "~/features/admin/crud/_components/crud-stats-cards";
import {
	applyCrudListSort,
	type CrudListSort,
} from "~/features/admin/crud/_lib/crud-list-sort";
import {
	matchesSearch,
	normalizeSearch,
} from "~/features/admin/crud/_lib/filter-helpers";
import { qaTicketStatusOptions } from "~/features/admin/crud/qa-ticket/qa-ticket.mappers";
import { QaTicketDetailDialog } from "~/features/admin/crud/qa-ticket/qa-ticket-detail-dialog";
import { QaTicketFormDialog } from "~/features/admin/crud/qa-ticket/qa-ticket-form-dialog";
import { QaTicketTable } from "~/features/admin/crud/qa-ticket/qa-ticket-table";
import type {
	CrudModalMode,
	CrudModalState,
} from "~/shared/common/admin-crud/crud.types";
import type {
	QaTicketFormValues,
	QaTicketListItem,
	QaTicketStatus,
} from "~/shared/common/admin-crud/qa-ticket.types";
import { api } from "~/trpc/react";

const allValue = "all";
const unassignedValue = "unassigned";

/** Same three modes as `crudListSortOptions`, but the default order is by code. */
const qaTicketSortOptions: Array<{ value: CrudListSort; label: string }> = [
	{ value: "default", label: "Por número" },
	{ value: "newest", label: "Más recientes" },
	{ value: "oldest", label: "Más antiguos" },
];

const closedForm: CrudModalState<number> = {
	open: false,
	mode: null,
	entityId: null,
};

export function QaTicketsClient() {
	const utils = api.useUtils();

	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<QaTicketStatus | "all">(
		allValue,
	);
	const [sectionFilter, setSectionFilter] = useState<string>(allValue);
	const [assigneeFilter, setAssigneeFilter] = useState<string>(allValue);
	const [regressionOnly, setRegressionOnly] = useState(false);
	const [includeDeleted, setIncludeDeleted] = useState(false);
	const [listSort, setListSort] = useState<CrudListSort>("default");
	const [openTicketId, setOpenTicketId] = useState<number | null>(null);
	const [formState, setFormState] =
		useState<CrudModalState<number>>(closedForm);
	const [softDeleteTarget, setSoftDeleteTarget] =
		useState<QaTicketListItem | null>(null);
	const [hardDeleteTarget, setHardDeleteTarget] =
		useState<QaTicketListItem | null>(null);

	const listQuery = api.admin.qaTicket.list.useQuery({ includeDeleted });
	const statsQuery = api.admin.qaTicket.getStats.useQuery();
	const detailQuery = api.admin.qaTicket.getById.useQuery(
		{ id: openTicketId ?? 0 },
		{ enabled: openTicketId !== null },
	);
	const formTicketQuery = api.admin.qaTicket.getById.useQuery(
		{ id: formState.entityId ?? 0 },
		{ enabled: formState.mode === "edit" && formState.entityId !== null },
	);
	const userOptionsQuery = api.admin.user.options.useQuery({ take: 50 });

	const invalidateQaTicketQueries = async () => {
		await Promise.all([
			utils.admin.qaTicket.list.invalidate(),
			utils.admin.qaTicket.getStats.invalidate(),
			utils.admin.qaTicket.getById.invalidate(),
		]);
	};

	const closeForm = () => setFormState(closedForm);

	const createMutation = api.admin.qaTicket.create.useMutation({
		onSuccess: async () => {
			toast.success("Ticket de QA creado");
			closeForm();
			await invalidateQaTicketQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo crear el ticket de QA");
		},
	});

	const updateMutation = api.admin.qaTicket.update.useMutation({
		onSuccess: async () => {
			toast.success("Ticket de QA actualizado");
			closeForm();
			await invalidateQaTicketQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo actualizar el ticket de QA");
		},
	});

	const setStatusMutation = api.admin.qaTicket.setStatus.useMutation({
		onSuccess: async () => {
			toast.success("Resultado guardado");
			await invalidateQaTicketQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo guardar el resultado");
		},
	});

	const claimMutation = api.admin.qaTicket.claim.useMutation({
		onSuccess: async (ticket) => {
			toast.success(`Tomaste el caso #${ticket.code}`);
			await invalidateQaTicketQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo tomar el caso");
		},
	});

	const softDeleteMutation = api.admin.qaTicket.softDelete.useMutation({
		onSuccess: async () => {
			toast.warning("Ticket de QA enviado a papelera");
			setSoftDeleteTarget(null);
			await invalidateQaTicketQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar el ticket de QA");
		},
	});

	const hardDeleteMutation = api.admin.qaTicket.hardDelete.useMutation({
		onSuccess: async () => {
			toast.success("Ticket de QA eliminado definitivamente");
			setHardDeleteTarget(null);
			await invalidateQaTicketQueries();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo eliminar definitivamente");
		},
	});

	const tickets = useMemo(() => listQuery.data ?? [], [listQuery.data]);

	const sectionOptions = useMemo(
		() => [...new Set(tickets.map((ticket) => ticket.section))].sort(),
		[tickets],
	);

	const assigneeFilterOptions = useMemo(() => {
		const byId = new Map<string, string>();
		for (const ticket of tickets) {
			if (ticket.assignee) byId.set(ticket.assignee.id, ticket.assignee.name);
		}
		return [...byId].map(([id, name]) => ({ id, name }));
	}, [tickets]);

	const assigneeComboboxOptions = useMemo<ComboboxOption[]>(
		() =>
			(userOptionsQuery.data ?? []).map((option) => ({
				value: option.value,
				label: `${option.label}${option.deleted ? " (eliminado)" : ""}`,
			})),
		[userOptionsQuery.data],
	);

	const filteredTickets = useMemo(() => {
		const search = normalizeSearch(searchTerm);

		const matched = tickets.filter((ticket) => {
			if (statusFilter !== allValue && ticket.status !== statusFilter) {
				return false;
			}
			if (sectionFilter !== allValue && ticket.section !== sectionFilter) {
				return false;
			}
			if (assigneeFilter !== allValue) {
				const assigneeId = ticket.assignee?.id ?? unassignedValue;
				if (assigneeId !== assigneeFilter) return false;
			}
			if (regressionOnly && !ticket.isRegressionPath) return false;

			return matchesSearch(search, [
				ticket.code,
				ticket.title,
				ticket.section,
				ticket.actor,
				ticket.feature,
			]);
		});

		return applyCrudListSort(matched, listSort);
	}, [
		assigneeFilter,
		listSort,
		regressionOnly,
		searchTerm,
		sectionFilter,
		statusFilter,
		tickets,
	]);

	const activeAdvancedCount = [
		assigneeFilter !== allValue,
		regressionOnly,
		includeDeleted,
	].filter(Boolean).length;

	const clearFilters = () => {
		setSearchTerm("");
		setStatusFilter(allValue);
		setSectionFilter(allValue);
		setAssigneeFilter(allValue);
		setRegressionOnly(false);
		setIncludeDeleted(false);
		setListSort("default");
	};

	const handleSubmit = (values: QaTicketFormValues) => {
		if (formState.mode === "edit" && formState.entityId !== null) {
			updateMutation.mutate({ id: formState.entityId, ...values });
			return;
		}

		createMutation.mutate(values);
	};

	const formMode: CrudModalMode = formState.mode ?? "create";

	const renderTable = () => {
		if (listQuery.isLoading) return <CrudLoadingState />;
		if (listQuery.isError) {
			return <CrudErrorState message={listQuery.error.message} />;
		}
		if (filteredTickets.length === 0) {
			return (
				<CrudEmptyState
					description="Ajustá los filtros o agregá un ticket de QA nuevo."
					title="No hay tickets de QA para mostrar"
				/>
			);
		}

		return (
			<QaTicketTable
				onClaim={(ticket) => claimMutation.mutate({ id: ticket.id })}
				onEdit={(ticket) =>
					setFormState({ open: true, mode: "edit", entityId: ticket.id })
				}
				onHardDelete={setHardDeleteTarget}
				onOpen={(ticket) => setOpenTicketId(ticket.id)}
				onSoftDelete={setSoftDeleteTarget}
				tickets={filteredTickets}
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
					variant="highlight"
				>
					<PlusIcon data-icon="inline-start" />
					Agregar ticket
				</Button>
			}
			description="Tracking interno de la pasada de QA: quién corre qué caso y cómo salió."
			title="Tickets de QA"
		>
			{statsQuery.isLoading ? (
				<CrudLoadingState rows={2} />
			) : statsQuery.isError ? (
				<CrudErrorState message={statsQuery.error.message} />
			) : statsQuery.data ? (
				<CrudStatsCards
					stats={[
						{
							label: "Total",
							value: statsQuery.data.total,
							icon: ListChecksIcon,
							description: "Incluye eliminados",
						},
						{
							label: "Pendientes",
							value: statsQuery.data.pending,
							icon: CircleDashedIcon,
							description: "Todavía sin correr",
						},
						{
							label: "Completos OK",
							value: statsQuery.data.passed,
							icon: CheckCircle2Icon,
							accent: "success",
						},
						{
							label: "Fallidos",
							value: statsQuery.data.failed,
							icon: XCircleIcon,
							accent: "destructive",
						},
					]}
				/>
			) : null}

			<section className="flex flex-col gap-3">
				<CrudFilterPanel
					activeAdvancedCount={activeAdvancedCount}
					advanced={
						<>
							<Field>
								<FieldLabel htmlFor="qa-ticket-filter-assignee">
									Asignado
								</FieldLabel>
								<Select
									id="qa-ticket-filter-assignee"
									onChange={(event) => setAssigneeFilter(event.target.value)}
									value={assigneeFilter}
								>
									<option value={allValue}>Todos</option>
									<option value={unassignedValue}>Sin asignar</option>
									{assigneeFilterOptions.map((option) => (
										<option key={option.id} value={option.id}>
											{option.name}
										</option>
									))}
								</Select>
							</Field>
							<Field orientation="horizontal">
								<Switch
									checked={regressionOnly}
									id="qa-ticket-filter-regression"
									onCheckedChange={setRegressionOnly}
								/>
								<FieldContent>
									<FieldLabel htmlFor="qa-ticket-filter-regression">
										Solo regresión
									</FieldLabel>
									<FieldDescription>
										Pasada corta de punta a punta
									</FieldDescription>
								</FieldContent>
							</Field>
							<Field orientation="horizontal">
								<Switch
									checked={includeDeleted}
									id="qa-ticket-filter-deleted"
									onCheckedChange={setIncludeDeleted}
								/>
								<FieldContent>
									<FieldLabel htmlFor="qa-ticket-filter-deleted">
										Mostrar eliminados
									</FieldLabel>
									<FieldDescription>Baja lógica</FieldDescription>
								</FieldContent>
							</Field>
						</>
					}
					onReset={clearFilters}
					primary={
						<>
							<Field>
								<FieldLabel htmlFor="qa-ticket-search">Buscar</FieldLabel>
								<div className="relative">
									<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
									<Input
										className="pl-8"
										id="qa-ticket-search"
										onChange={(event) => setSearchTerm(event.target.value)}
										placeholder="Número, título, sección o feature"
										value={searchTerm}
									/>
								</div>
							</Field>
							<Field>
								<FieldLabel htmlFor="qa-ticket-filter-status">
									Estado
								</FieldLabel>
								<Select
									id="qa-ticket-filter-status"
									onChange={(event) =>
										setStatusFilter(
											event.target.value as QaTicketStatus | "all",
										)
									}
									value={statusFilter}
								>
									<option value={allValue}>Todos</option>
									{qaTicketStatusOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="qa-ticket-filter-section">
									Sección
								</FieldLabel>
								<Select
									id="qa-ticket-filter-section"
									onChange={(event) => setSectionFilter(event.target.value)}
									value={sectionFilter}
								>
									<option value={allValue}>Todas</option>
									{sectionOptions.map((section) => (
										<option key={section} value={section}>
											{section}
										</option>
									))}
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="qa-ticket-sort">Orden</FieldLabel>
								<Select
									id="qa-ticket-sort"
									onChange={(event) =>
										setListSort(event.target.value as CrudListSort)
									}
									value={listSort}
								>
									{qaTicketSortOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</Field>
						</>
					}
				/>

				{renderTable()}
			</section>

			<QaTicketDetailDialog
				errorMessage={detailQuery.error?.message}
				isClaiming={claimMutation.isPending}
				isError={detailQuery.isError}
				isLoading={detailQuery.isLoading && openTicketId !== null}
				isSettingStatus={setStatusMutation.isPending}
				onClaim={() => {
					if (openTicketId === null) return;
					claimMutation.mutate({ id: openTicketId });
				}}
				onOpenChange={(open) => {
					if (!open) setOpenTicketId(null);
				}}
				onSetStatus={(input) => {
					if (openTicketId === null) return;
					setStatusMutation.mutate({ id: openTicketId, ...input });
				}}
				open={openTicketId !== null}
				ticket={detailQuery.data}
			/>

			<QaTicketFormDialog
				assigneeOptions={assigneeComboboxOptions}
				isLoadingTicket={formTicketQuery.isLoading}
				isSubmitting={createMutation.isPending || updateMutation.isPending}
				mode={formMode}
				onOpenChange={(open) => {
					if (!open) closeForm();
				}}
				onSubmit={handleSubmit}
				open={formState.open}
				ticket={formTicketQuery.data}
			/>

			<CrudDeleteDialog
				confirmLabel="Enviar a papelera"
				description={
					softDeleteTarget
						? `El ticket #${softDeleteTarget.code} "${softDeleteTarget.title}" queda eliminado lógicamente.`
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
						? `Escribí "${hardDeleteTarget.code}" para confirmar`
						: undefined
				}
				confirmationValue={
					hardDeleteTarget ? String(hardDeleteTarget.code) : undefined
				}
				confirmLabel="Eliminar definitivamente"
				description={
					hardDeleteTarget
						? `El ticket #${hardDeleteTarget.code} "${hardDeleteTarget.title}" se borra de la base de datos. Volver a correr "pnpm qa:seed" lo recrea desde el documento, pero sin su estado ni sus notas.`
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
