"use client";

import { AlertTriangleIcon, PlayIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { useDebouncedValue } from "~/features/admin/crud/_lib/use-debounced-value";
import {
	fromScaled,
	sumScaled,
	toScaled,
} from "~/features/admin/crud/supplier-order/supplier-order-quantity";
import type { DestinationListItem } from "~/shared/common/admin-crud/destination.types";
import type {
	OperationOmissions,
	OperationReviewRow,
} from "~/shared/common/admin-crud/operation.types";
import { toDateTimeLocalValue } from "~/shared/common/date.helpers";
import { api } from "~/trpc/react";

type ParameterDraft = {
	from: string;
	to: string;
	destinationId: number;
	includeRollOver: boolean;
	notes: string;
};

const sameOmissions = (left: OperationOmissions, right: OperationOmissions) =>
	left.sourceKeys.length === right.sourceKeys.length &&
	left.userIds.length === right.userIds.length &&
	left.sourceKeys.every((key) => right.sourceKeys.includes(key)) &&
	left.userIds.every((id) => right.userIds.includes(id));

const toggle = (values: string[], value: string) =>
	values.includes(value)
		? values.filter((entry) => entry !== value)
		: [...values, value];

/**
 * Exact on scaled `bigint`, never through `Number()`: quantities are
 * `Decimal(18,4)` and a float round-trip would let the strip disagree with the
 * execution it is previewing.
 */
const sumQuantities = (values: string[]) =>
	fromScaled(sumScaled(values.map((value) => toScaled(value) ?? 0n)));

/**
 * Recomputes the whole preview from the rows as omissions toggle, with no server
 * round trip. Exact because `calculateAssignableQuantity` is applied per demand
 * item upstream: an item's supplier, assigned quantity and roll over never depend
 * on which other items are present, so restricting to the kept rows restricts the
 * plan the same way (ADR 0006).
 */
function previewFromRows(rows: OperationReviewRow[], omitted: Set<string>) {
	const kept = rows.filter((row) => !omitted.has(row.sourceKey));
	const dropped = rows.filter((row) => omitted.has(row.sourceKey));
	const assigned = kept.filter(
		(row) => (toScaled(row.assignedQuantity) ?? 0n) > 0n,
	);
	const rolledOver = kept.filter(
		(row) => (toScaled(row.rollOverQuantity) ?? 0n) > 0n,
	);

	const bySupplier = new Map<
		number,
		{ name: string; terms: Set<number>; quantities: string[] }
	>();
	for (const row of assigned) {
		if (!row.supplier) continue;
		const group = bySupplier.get(row.supplier.id) ?? {
			name: row.supplier.name,
			terms: new Set<number>(),
			quantities: [],
		};
		if (row.productSupplierTermsId !== null) {
			group.terms.add(row.productSupplierTermsId);
		}
		group.quantities.push(row.assignedQuantity);
		bySupplier.set(row.supplier.id, group);
	}

	const groups = Array.from(bySupplier.entries()).map(([id, group]) => ({
		supplierId: id,
		supplierName: group.name,
		lotItemCount: group.terms.size,
		quantity: sumQuantities(group.quantities),
	}));

	return {
		kept,
		groups,
		totals: {
			eligibleItemCount: kept.length,
			eligibleQuantity: sumQuantities(kept.map((row) => row.quantity)),
			omittedItemCount: dropped.length,
			omittedQuantity: sumQuantities(dropped.map((row) => row.quantity)),
			assignedItemCount: new Set(assigned.map((row) => row.cartItemId)).size,
			assignedQuantity: sumQuantities(
				assigned.map((row) => row.assignedQuantity),
			),
			rollOverItemCount: new Set(rolledOver.map((row) => row.cartItemId)).size,
			rollOverQuantity: sumQuantities(
				rolledOver.map((row) => row.rollOverQuantity),
			),
			lotCount: groups.length,
		},
	};
}

function Totals({
	totals,
}: {
	totals: ReturnType<typeof previewFromRows>["totals"];
}) {
	const cells = [
		{
			label: "Elegible",
			value: totals.eligibleQuantity,
			count: totals.eligibleItemCount,
		},
		{
			label: "Omitida",
			value: totals.omittedQuantity,
			count: totals.omittedItemCount,
		},
		{
			label: "Asignada",
			value: totals.assignedQuantity,
			count: totals.assignedItemCount,
		},
		{
			label: "Rollover",
			value: totals.rollOverQuantity,
			count: totals.rollOverItemCount,
		},
		{ label: "Lotes", value: String(totals.lotCount), count: null },
	];

	return (
		<div className="grid grid-cols-2 gap-2 md:grid-cols-5">
			{cells.map((cell) => (
				<div
					className="rounded-md border bg-muted/40 px-3 py-2"
					key={cell.label}
				>
					<p className="text-muted-foreground text-xs">{cell.label}</p>
					<p className="font-medium text-sm">{cell.value}</p>
					{cell.count === null ? null : (
						<p className="text-muted-foreground text-xs">
							{cell.count} ítem(s)
						</p>
					)}
				</div>
			))}
		</div>
	);
}

export function OperationReviewDialog({
	operationId,
	open,
	destinations,
	onOpenChange,
	onDiscard,
	onExecuted,
}: {
	operationId: number | null;
	open: boolean;
	destinations: DestinationListItem[];
	onOpenChange: (open: boolean) => void;
	onDiscard: (operationId: number) => void;
	onExecuted: (operationId: number) => void;
}) {
	const utils = api.useUtils();
	const [omissions, setOmissions] = useState<OperationOmissions>({
		sourceKeys: [],
		userIds: [],
	});
	const [parameters, setParameters] = useState<ParameterDraft | null>(null);
	const [conflict, setConflict] = useState<string | null>(null);
	const persisted = useRef<OperationOmissions | null>(null);

	const reviewQuery = api.admin.operation.review.useQuery(
		{ id: operationId ?? 0 },
		{ enabled: open && operationId !== null },
	);

	const data = reviewQuery.data;

	// The server payload is the source of truth on open and after every write; the
	// local copy exists only so a toggle renders before the round trip lands.
	useEffect(() => {
		if (!data) return;
		persisted.current = data.omissions;
		setOmissions(data.omissions);
		setParameters({
			from: toDateTimeLocalValue(data.operation.from),
			to: toDateTimeLocalValue(data.operation.to),
			destinationId: data.operation.destination?.id ?? 0,
			includeRollOver: data.operation.includeRollOver,
			notes: data.operation.notes ?? "",
		});
	}, [data]);

	useEffect(() => {
		if (!open) setConflict(null);
	}, [open]);

	const updateDraft = api.admin.operation.updateDraft.useMutation({
		onSuccess: async (result) => {
			persisted.current = result.omissions;
			setOmissions(result.omissions);
			const droppedCount =
				result.prunedOmissions.sourceKeys.length +
				result.prunedOmissions.userIds.length;
			if (droppedCount > 0) {
				toast.info(
					`Se descartaron ${droppedCount} omisión(es) cuya demanda ya no entra en la ventana`,
				);
			}
			await utils.admin.operation.review.invalidate();
			await utils.admin.operation.list.invalidate();
		},
		onError: (error) => {
			toast.error(error.message || "No se pudo guardar el borrador");
			if (persisted.current) setOmissions(persisted.current);
		},
	});

	const executeMutation = api.admin.operation.execute.useMutation({
		onSuccess: async (operation) => {
			toast.success("Operación ejecutada");
			onExecuted(operation.id);
			onOpenChange(false);
		},
		onError: async (error) => {
			if (error.data?.code === "CONFLICT") {
				// Not a failure: the row is still a draft and the omissions survived.
				// Refetching re-arms the button with a fingerprint for the fresh set.
				setConflict(error.message);
				await utils.admin.operation.review.invalidate();
				return;
			}
			toast.error(error.message || "No se pudo ejecutar la operación");
		},
	});

	const debouncedOmissions = useDebouncedValue(omissions, 600);
	const persistOmissions = updateDraft.mutate;

	// A draft is durable: closing the dialog must not lose an omission, so every
	// settled change is written back rather than held in React state (ADR 0006).
	useEffect(() => {
		if (operationId === null || !persisted.current) return;
		if (sameOmissions(debouncedOmissions, persisted.current)) return;
		persistOmissions({ id: operationId, omissions: debouncedOmissions });
	}, [debouncedOmissions, operationId, persistOmissions]);

	const rows = data?.rows ?? [];
	const omittedKeys = useMemo(() => {
		const keys = new Set(omissions.sourceKeys);
		const users = new Set(omissions.userIds);
		for (const row of rows) {
			if (users.has(row.user.id)) keys.add(row.sourceKey);
		}
		return keys;
	}, [omissions, rows]);

	const preview = useMemo(
		() => previewFromRows(rows, omittedKeys),
		[rows, omittedKeys],
	);

	const userGroups = useMemo(() => {
		const groups = new Map<
			string,
			{ name: string; rows: OperationReviewRow[] }
		>();
		for (const row of rows) {
			const group = groups.get(row.user.id) ?? {
				name: row.user.name,
				rows: [],
			};
			group.rows.push(row);
			groups.set(row.user.id, group);
		}
		return Array.from(groups.entries());
	}, [rows]);

	const pendingWrite =
		updateDraft.isPending ||
		(persisted.current !== null &&
			!sameOmissions(omissions, persisted.current));

	const canExecute =
		data !== undefined &&
		!pendingWrite &&
		!executeMutation.isPending &&
		preview.totals.eligibleItemCount > 0;

	const applyParameters = () => {
		if (operationId === null || !parameters) return;
		updateDraft.mutate({
			id: operationId,
			from: parameters.from,
			to: parameters.to,
			destinationId: parameters.destinationId,
			includeRollOver: parameters.includeRollOver,
			notes: parameters.notes.trim().length > 0 ? parameters.notes : undefined,
		});
	};

	const activeDestinations = destinations.filter(
		(destination) => destination.active && !destination.deleted,
	);

	const renderBody = () => {
		if (reviewQuery.isPending) return <CrudLoadingState rows={4} />;
		if (reviewQuery.isError) {
			return (
				<CrudErrorState
					message={reviewQuery.error.message || "No se pudo cargar la revisión"}
				/>
			);
		}
		if (!data || !parameters) return null;

		return (
			<div className="flex flex-col gap-4">
				{conflict ? (
					<div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
						<AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" />
						<p className="text-sm">
							{conflict} La lista de abajo ya es la demanda actual.
						</p>
					</div>
				) : null}

				<div className="grid gap-3 rounded-md border p-3 md:grid-cols-4">
					<Field>
						<FieldLabel htmlFor="review-from">Desde</FieldLabel>
						<Input
							id="review-from"
							onChange={(event) =>
								setParameters({ ...parameters, from: event.target.value })
							}
							type="datetime-local"
							value={parameters.from}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="review-to">Hasta</FieldLabel>
						<Input
							id="review-to"
							onChange={(event) =>
								setParameters({ ...parameters, to: event.target.value })
							}
							type="datetime-local"
							value={parameters.to}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="review-destination">Destino</FieldLabel>
						<Select
							id="review-destination"
							onChange={(event) =>
								setParameters({
									...parameters,
									destinationId: Number(event.target.value),
								})
							}
							value={String(parameters.destinationId || "")}
						>
							<option value="">Seleccionar</option>
							{activeDestinations.map((destination) => (
								<option key={destination.id} value={destination.id}>
									{destination.name}
								</option>
							))}
						</Select>
					</Field>
					<Field orientation="horizontal">
						<Switch
							checked={parameters.includeRollOver}
							id="review-include-rollover"
							onCheckedChange={(checked) =>
								setParameters({ ...parameters, includeRollOver: checked })
							}
						/>
						<FieldLabel htmlFor="review-include-rollover">
							Incluir rollovers
						</FieldLabel>
					</Field>
					<div className="md:col-span-3">
						<Field>
							<FieldLabel htmlFor="review-notes">Notas</FieldLabel>
							<Textarea
								id="review-notes"
								onChange={(event) =>
									setParameters({ ...parameters, notes: event.target.value })
								}
								value={parameters.notes}
							/>
						</Field>
					</div>
					<div className="flex items-end">
						<Button
							disabled={updateDraft.isPending}
							onClick={applyParameters}
							type="button"
							variant="outline"
						>
							Aplicar parámetros
						</Button>
					</div>
				</div>

				<Totals totals={preview.totals} />

				<div className="rounded-md border p-3">
					<p className="mb-2 font-medium text-sm">
						Lotes y órdenes que se crearían
					</p>
					{preview.groups.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Ningún ítem elegible resuelve proveedor: no se crearía ningún
							lote.
						</p>
					) : (
						<ul className="flex flex-col gap-1">
							{preview.groups.map((group) => (
								<li
									className="flex items-center justify-between text-sm"
									key={group.supplierId}
								>
									<span>{group.supplierName}</span>
									<span className="text-muted-foreground">
										{group.lotItemCount} línea(s) · {group.quantity}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="max-h-[45vh] overflow-auto rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-10" />
								<TableHead>Cliente / ítem</TableHead>
								<TableHead>Producto</TableHead>
								<TableHead className="text-right">Cantidad</TableHead>
								<TableHead>Proveedor</TableHead>
								<TableHead className="text-right">Asignada</TableHead>
								<TableHead className="text-right">Rollover</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{userGroups.map(([userId, group]) => (
								<UserGroup
									group={group}
									key={userId}
									omittedKeys={omittedKeys}
									onToggleRow={(sourceKey) =>
										setOmissions((current) => ({
											...current,
											sourceKeys: toggle(current.sourceKeys, sourceKey),
										}))
									}
									onToggleUser={() =>
										setOmissions((current) => ({
											...current,
											userIds: toggle(current.userIds, userId),
										}))
									}
									userOmitted={omissions.userIds.includes(userId)}
								/>
							))}
						</TableBody>
					</Table>
					{rows.length === 0 ? (
						<p className="p-4 text-center text-muted-foreground text-sm">
							No hay demanda en esta ventana.
						</p>
					) : null}
				</div>
			</div>
		);
	};

	return (
		<CrudFormDialogShell
			contentClassName="sm:max-w-[95vw]"
			description="Revisá la demanda que se agruparía y omití lo que no debe entrar. Ejecutar recalcula sobre datos vivos y se rechaza si la demanda cambió."
			footer={
				<>
					<Button
						disabled={operationId === null || executeMutation.isPending}
						onClick={() => {
							if (operationId !== null) onDiscard(operationId);
						}}
						type="button"
						variant="destructive"
					>
						Descartar
					</Button>
					<Button
						disabled={executeMutation.isPending}
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cancelar
					</Button>
					<Button
						disabled={!canExecute}
						onClick={() => {
							if (operationId === null || !data) return;
							setConflict(null);
							executeMutation.mutate({
								id: operationId,
								fingerprint: data.fingerprint,
							});
						}}
						type="button"
						variant="highlight"
					>
						<PlayIcon data-icon="inline-start" />
						Ejecutar
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Revisar ${data?.operation.code ?? "operación"}`}
		>
			{renderBody()}
		</CrudFormDialogShell>
	);
}

function UserGroup({
	group,
	omittedKeys,
	userOmitted,
	onToggleUser,
	onToggleRow,
}: {
	group: { name: string; rows: OperationReviewRow[] };
	omittedKeys: Set<string>;
	userOmitted: boolean;
	onToggleUser: () => void;
	onToggleRow: (sourceKey: string) => void;
}) {
	return (
		<>
			<TableRow className="bg-muted/50">
				<TableCell>
					<Checkbox
						aria-label={`Omitir a ${group.name}`}
						checked={userOmitted}
						onCheckedChange={onToggleUser}
					/>
				</TableCell>
				<TableCell className="font-medium" colSpan={6}>
					{group.name}
					<span className="ml-2 text-muted-foreground text-xs">
						{group.rows.length} ítem(s)
					</span>
					{userOmitted ? (
						<Badge className="ml-2" variant="outline">
							Cliente omitido
						</Badge>
					) : null}
				</TableCell>
			</TableRow>
			{group.rows.map((row) => {
				const omitted = omittedKeys.has(row.sourceKey);

				return (
					<TableRow
						className={omitted ? "opacity-50" : undefined}
						key={row.sourceKey}
					>
						<TableCell>
							<Checkbox
								aria-label={`Omitir ${row.cartItemCode}`}
								// A user-level omission is a standing decision; the row cannot
								// opt out of it individually (ADR 0006).
								checked={omitted}
								disabled={userOmitted}
								onCheckedChange={() => onToggleRow(row.sourceKey)}
							/>
						</TableCell>
						<TableCell>
							<div className="flex flex-col">
								<span className="text-xs">{row.cartItemCode}</span>
								<span className="text-muted-foreground text-xs">
									{row.cartCode}
									{row.source === "rollOver" ? " · rollover" : ""}
								</span>
							</div>
						</TableCell>
						<TableCell className="text-sm">{row.product.name}</TableCell>
						<TableCell className="text-right text-sm">{row.quantity}</TableCell>
						<TableCell className="text-sm">
							{row.supplier?.name ?? (
								<span className="text-muted-foreground">Sin proveedor</span>
							)}
						</TableCell>
						<TableCell className="text-right text-sm">
							{row.assignedQuantity}
						</TableCell>
						<TableCell className="text-right text-sm">
							<div className="flex flex-col items-end">
								<span>{row.rollOverQuantity}</span>
								{row.rollOverReason ? (
									<span className="text-muted-foreground text-xs">
										{row.rollOverReason}
									</span>
								) : null}
							</div>
						</TableCell>
					</TableRow>
				);
			})}
		</>
	);
}
