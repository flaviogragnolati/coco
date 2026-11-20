"use client";

import Link from "next/link";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { IdTooltip } from "~/features/admin/crud/_components/crud-cell-tooltips";
import {
	DetailDiagnosticList,
	DetailEmpty,
	DetailField,
	DetailGrid,
	DetailItem,
	DetailMetrics,
	DetailSection,
	DetailSectionTitle,
} from "~/features/admin/crud/_components/crud-detail";
import { CrudDetailDialogShell } from "~/features/admin/crud/_components/crud-detail-dialog-shell";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import {
	lotItemStatusConfig,
	lotStatusConfig,
} from "~/features/admin/crud/lot/lot.mappers";
import type {
	SupplierOrderCommandKey,
	SupplierOrderDetail,
} from "~/shared/common/admin-crud/supplier-order.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import {
	supplierOrderActionLabelMap,
	supplierOrderStatusConfig,
} from "./supplier-order.mappers";

type SupplierOrderLotItem =
	SupplierOrderDetail["lots"][number]["lotItems"][number];

function Fechas({ order }: { order: SupplierOrderDetail }) {
	const hasMilestones = Boolean(
		order.requestedAt || order.confirmedAt || order.cancelledAt,
	);

	return (
		<DetailField
			hint={
				hasMilestones ? (
					<span className="flex flex-col gap-0.5">
						{order.requestedAt ? (
							<span>
								Solicitada {formatDateTimeShort(new Date(order.requestedAt))}
							</span>
						) : null}
						{order.confirmedAt ? (
							<span>
								Confirmada {formatDateTimeShort(new Date(order.confirmedAt))}
							</span>
						) : null}
						{order.cancelledAt ? (
							<span>
								Cancelada {formatDateTimeShort(new Date(order.cancelledAt))}
							</span>
						) : null}
					</span>
				) : undefined
			}
			label="Fechas"
		>
			<span className="font-normal">
				Creada {formatDateTimeShort(new Date(order.createdAt))}
			</span>
		</DetailField>
	);
}

function Resumen({ order }: { order: SupplierOrderDetail }) {
	return (
		<div className="flex flex-col gap-3">
			<DetailMetrics
				columns={3}
				items={[
					{
						label: "Líneas activas",
						value: `${order.liveLotItemCount} / ${order.lotItemCount}`,
					},
					{ label: "Cantidad activa", value: order.liveLotItemQuantity },
					{ label: "Cantidad total", value: order.lotItemQuantity },
				]}
			/>

			<DetailSection title="Datos de la orden">
				<DetailGrid columns={4}>
					<DetailField
						hint={<IdTooltip id={order.supplier.id} label="Proveedor" />}
						label="Proveedor"
					>
						{order.supplier.name}
					</DetailField>
					<DetailField label="Referencia externa">
						{order.externalReference ?? "—"}
					</DetailField>
					<DetailField label="Operación">
						{order.operations.length === 0 ? (
							<span className="font-normal text-muted-foreground">
								Sin operación
							</span>
						) : (
							<span className="flex flex-col gap-0.5">
								{order.operations.map((operation) => (
									<span key={operation.id}>{operation.code}</span>
								))}
							</span>
						)}
					</DetailField>
					<Fechas order={order} />
				</DetailGrid>
			</DetailSection>

			<DetailSection title="Diagnósticos">
				<DetailDiagnosticList diagnostics={order.diagnostics} />
			</DetailSection>
		</div>
	);
}

function LineaDemanda({
	lotItem,
	onCancelLine,
}: {
	lotItem: SupplierOrderLotItem;
	onCancelLine?: (lotItem: SupplierOrderLotItem) => void;
}) {
	return (
		<DetailItem>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="flex flex-col gap-1.5">
					<p className="font-medium">
						<span className="font-mono text-muted-foreground text-xs">
							{lotItem.code}
						</span>{" "}
						{lotItem.product.name}
					</p>
					<div className="flex flex-wrap items-center gap-2">
						<StatusChip config={lotItemStatusConfig[lotItem.status]} />
						<span className="text-muted-foreground text-xs">
							Destino {lotItem.destination.name}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="text-right">
						<p className="font-semibold text-sm tabular-nums">
							{lotItem.quantity}{" "}
							<span className="font-normal text-muted-foreground">
								{lotItem.product.unit}
							</span>
						</p>
						<p className="text-muted-foreground text-xs tabular-nums">
							Despachado {lotItem.dispatchedQuantity} · pendiente{" "}
							{lotItem.remainingQuantity}
						</p>
					</div>
					{onCancelLine && lotItem.status !== "cancelled" ? (
						<Button
							onClick={() => onCancelLine(lotItem)}
							size="sm"
							type="button"
							variant="outline"
						>
							Cancelar línea
						</Button>
					) : null}
				</div>
			</div>

			{lotItem.demandAllocations.length === 0 ? (
				<DetailEmpty className="mt-3">Sin demanda asignada</DetailEmpty>
			) : (
				<ul className="mt-3 flex flex-col divide-y border-t text-xs">
					{lotItem.demandAllocations.map((allocation) => (
						<li
							className="grid items-center gap-x-3 gap-y-1 py-2 last:pb-0 md:grid-cols-[2rem_1fr_5rem_14rem]"
							key={allocation.id}
						>
							{/* Absorption order: who a cut takes from first (LIFO by payment). */}
							<span className="text-muted-foreground tabular-nums">
								#{allocation.absorptionOrder + 1}
							</span>
							<Link
								className="font-medium font-mono underline-offset-4 hover:underline"
								href={`/admin/tracking?cartItemId=${allocation.cartItem.id}`}
							>
								{allocation.cartItem.cart.code} / {allocation.cartItem.code}
							</Link>
							<span className="tabular-nums md:text-right">
								{allocation.quantity}
							</span>
							<span className="text-muted-foreground">
								{allocation.paidAt
									? `Pagado ${formatDateTimeShort(new Date(allocation.paidAt))}`
									: "Sin pago resuelto"}
							</span>
						</li>
					))}
				</ul>
			)}
		</DetailItem>
	);
}

function Lineas({
	order,
	onCancelLine,
}: {
	order: SupplierOrderDetail;
	onCancelLine?: (lotItem: SupplierOrderLotItem) => void;
}) {
	if (order.lots.length === 0) {
		return <DetailEmpty>Sin lotes asociados</DetailEmpty>;
	}

	return (
		<Accordion
			className="w-full"
			defaultValue={order.lots.map((lot) => `lot-${lot.id}`)}
			type="multiple"
		>
			{order.lots.map((lot) => (
				<AccordionItem key={lot.id} value={`lot-${lot.id}`}>
					<AccordionTrigger>
						<span className="flex flex-wrap items-center gap-2">
							<span className="font-mono">{lot.code}</span>
							<StatusChip config={lotStatusConfig[lot.status]} />
							<span className="text-muted-foreground text-xs tabular-nums">
								{lot.operation.code} · {lot.lotItems.length} línea(s)
							</span>
						</span>
					</AccordionTrigger>
					<AccordionContent className="flex flex-col gap-2">
						{lot.lotItems.map((lotItem) => (
							<LineaDemanda
								key={lotItem.id}
								lotItem={lotItem}
								onCancelLine={onCancelLine}
							/>
						))}
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	);
}

/**
 * Footer actions come straight from the server's `availableActions`. The UI
 * never re-derives the ladder rules — duplicating them is exactly the dual-truth
 * problem the shared transition module exists to end.
 */
function ActionButton({
	action,
	enabled,
	reason,
	destructive,
	onClick,
}: {
	action: SupplierOrderCommandKey;
	enabled: boolean;
	reason?: string;
	destructive?: boolean;
	onClick: () => void;
}) {
	const label = supplierOrderActionLabelMap[action];

	if (enabled) {
		return (
			<Button
				onClick={onClick}
				type="button"
				variant={destructive ? "destructive" : "outline"}
			>
				{label}
			</Button>
		);
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				{/* `aria-disabled` rather than `disabled`: the control has to stay
				    hoverable and focusable for the tooltip to explain itself. */}
				<Button
					aria-disabled
					className="opacity-50"
					onClick={(event) => event.preventDefault()}
					type="button"
					variant={destructive ? "destructive" : "outline"}
				>
					{label}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{reason ?? "Acción no disponible"}</TooltipContent>
		</Tooltip>
	);
}

export function SupplierOrderDetailDialog({
	open,
	supplierOrder,
	isLoading,
	errorMessage,
	onOpenChange,
	onRequest,
	onConfirm,
	onRegisterDispatch,
	onCancel,
	onCancelLine,
}: {
	open: boolean;
	supplierOrder?: SupplierOrderDetail;
	isLoading: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
	onRequest: () => void;
	onConfirm: () => void;
	onRegisterDispatch: () => void;
	onCancel: () => void;
	onCancelLine: (lotItem: SupplierOrderLotItem) => void;
}) {
	const actionHandlers: Record<SupplierOrderCommandKey, () => void> = {
		request: onRequest,
		confirm: onConfirm,
		registerDispatch: onRegisterDispatch,
		cancel: onCancel,
		// The line-level entry is informational in the footer: cancelling a line is
		// driven from the line's own button inside the accordion.
		cancelLine: () => undefined,
	};

	return (
		<CrudDetailDialogShell
			description="Líneas, demanda asignada y acciones sobre la orden."
			errorMessage={errorMessage}
			eyebrow="Orden de proveedor"
			footer={
				<>
					{supplierOrder
						? supplierOrder.availableActions
								.filter((entry) => entry.action !== "cancelLine")
								.map((entry) => (
									<ActionButton
										action={entry.action}
										destructive={entry.action === "cancel"}
										enabled={entry.enabled}
										key={entry.action}
										onClick={actionHandlers[entry.action]}
										reason={entry.reason}
									/>
								))
						: null}
					<Button onClick={() => onOpenChange(false)} type="button">
						Cerrar
					</Button>
				</>
			}
			isLoading={isLoading}
			onOpenChange={onOpenChange}
			open={open}
			status={
				supplierOrder ? (
					<StatusChip
						config={supplierOrderStatusConfig[supplierOrder.status]}
					/>
				) : null
			}
			title={
				supplierOrder ? supplierOrder.code : "Detalle de orden de proveedor"
			}
		>
			{supplierOrder ? (
				<div className="flex flex-col gap-4">
					<Resumen order={supplierOrder} />
					<section className="flex flex-col gap-1">
						<DetailSectionTitle>Líneas por lote</DetailSectionTitle>
						<Lineas
							onCancelLine={
								supplierOrder.availableActions.find(
									(entry) => entry.action === "cancelLine",
								)?.enabled
									? onCancelLine
									: undefined
							}
							order={supplierOrder}
						/>
					</section>
				</div>
			) : null}
		</CrudDetailDialogShell>
	);
}
