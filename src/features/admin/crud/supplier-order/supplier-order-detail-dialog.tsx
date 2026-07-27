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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { IdTooltip } from "~/features/admin/crud/_components/crud-cell-tooltips";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { DiagnosticDetailChip } from "~/features/admin/crud/_components/diagnostic-detail-chip";
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

function Resumen({ order }: { order: SupplierOrderDetail }) {
	return (
		<div className="flex flex-col gap-3">
			<section className="grid gap-3 rounded-2xl border p-3 md:grid-cols-4">
				<div className="flex flex-col gap-1">
					<p className="text-muted-foreground text-xs">Estado</p>
					<StatusChip config={supplierOrderStatusConfig[order.status]} />
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Proveedor</p>
					<p className="font-medium">{order.supplier.name}</p>
					<IdTooltip id={order.supplier.id} label="Proveedor" />
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Referencia externa</p>
					<p className="font-medium">{order.externalReference ?? "—"}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Operación</p>
					{order.operations.length === 0 ? (
						<p className="text-xs">Sin operación</p>
					) : (
						order.operations.map((operation) => (
							<p className="text-xs" key={operation.id}>
								{operation.code}
							</p>
						))
					)}
				</div>
			</section>

			<section className="grid gap-3 rounded-2xl border p-3 md:grid-cols-4">
				<div>
					<p className="text-muted-foreground text-xs">Líneas activas</p>
					<p className="font-medium">
						{order.liveLotItemCount} / {order.lotItemCount}
					</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Cantidad activa</p>
					<p className="font-medium">{order.liveLotItemQuantity}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Cantidad total</p>
					<p className="font-medium">{order.lotItemQuantity}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Fechas</p>
					<p className="text-xs">
						Creada {formatDateTimeShort(new Date(order.createdAt))}
					</p>
					{order.requestedAt ? (
						<p className="text-muted-foreground text-xs">
							Solicitada {formatDateTimeShort(new Date(order.requestedAt))}
						</p>
					) : null}
					{order.confirmedAt ? (
						<p className="text-muted-foreground text-xs">
							Confirmada {formatDateTimeShort(new Date(order.confirmedAt))}
						</p>
					) : null}
					{order.cancelledAt ? (
						<p className="text-muted-foreground text-xs">
							Cancelada {formatDateTimeShort(new Date(order.cancelledAt))}
						</p>
					) : null}
				</div>
			</section>

			<section className="rounded-2xl border p-3">
				<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					Diagnósticos
				</h3>
				<div className="mt-2 flex flex-col gap-2">
					{order.diagnostics.length > 0 ? (
						order.diagnostics.map((diagnostic) => (
							<div className="text-xs" key={diagnostic.code}>
								<DiagnosticDetailChip
									code={diagnostic.code}
									severity={diagnostic.severity}
								/>
								<p className="mt-1">{diagnostic.message}</p>
							</div>
						))
					) : (
						<p className="text-muted-foreground text-xs">Sin diagnósticos</p>
					)}
				</div>
			</section>
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
		<div className="rounded-lg border p-3" key={lotItem.id}>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<p className="font-medium">
						{lotItem.code} - {lotItem.product.name}
					</p>
					<div className="flex flex-wrap items-center gap-2">
						<StatusChip config={lotItemStatusConfig[lotItem.status]} />
						<span className="text-muted-foreground text-xs">
							Destino {lotItem.destination.name}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="text-right">
						<p className="text-sm">
							{lotItem.quantity} {lotItem.product.unit}
						</p>
						<p className="text-muted-foreground text-xs">
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

			<div className="mt-3 grid gap-2">
				{lotItem.demandAllocations.length === 0 ? (
					<p className="text-muted-foreground text-xs">Sin demanda asignada</p>
				) : (
					lotItem.demandAllocations.map((allocation) => (
						<div
							className="grid gap-2 border-t pt-2 text-xs md:grid-cols-[2rem_1fr_6rem_10rem]"
							key={allocation.id}
						>
							{/* Absorption order: who a cut takes from first (LIFO by payment). */}
							<span className="text-muted-foreground">
								#{allocation.absorptionOrder + 1}
							</span>
							<Link
								className="font-medium underline-offset-4 hover:underline"
								href={`/admin/tracking?cartItemId=${allocation.cartItem.id}`}
							>
								{allocation.cartItem.cart.code} / {allocation.cartItem.code}
							</Link>
							<span>{allocation.quantity}</span>
							<span className="text-muted-foreground">
								{allocation.paidAt
									? `Pagado ${formatDateTimeShort(new Date(allocation.paidAt))}`
									: "Sin pago resuelto"}
							</span>
						</div>
					))
				)}
			</div>
		</div>
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
		return <p className="text-muted-foreground text-xs">Sin lotes asociados</p>;
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
							{lot.code}
							<StatusChip config={lotStatusConfig[lot.status]} />
							<span className="text-muted-foreground text-xs">
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
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>
						{supplierOrder
							? supplierOrder.code
							: "Detalle de orden de proveedor"}
					</DialogTitle>
					<DialogDescription>
						Líneas, demanda asignada y acciones sobre la orden.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? <CrudLoadingState rows={4} /> : null}
				{!isLoading && errorMessage ? (
					<CrudErrorState message={errorMessage} />
				) : null}
				{!isLoading && supplierOrder ? (
					<div className="flex flex-col gap-4">
						<Resumen order={supplierOrder} />
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
					</div>
				) : null}

				<DialogFooter>
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
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
