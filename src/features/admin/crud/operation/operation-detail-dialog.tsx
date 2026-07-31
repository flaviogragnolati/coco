"use client";

import {
	BoxesIcon,
	ClipboardListIcon,
	HistoryIcon,
	RotateCcwIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import {
	DateTooltip,
	IdTooltip,
} from "~/features/admin/crud/_components/crud-cell-tooltips";
import { JsonPreview } from "~/features/admin/crud/_components/crud-json-preview";
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
import { supplierOrderStatusConfig } from "~/features/admin/crud/supplier-order/supplier-order.mappers";
import type {
	OperationCommandKey,
	OperationDetail,
} from "~/shared/common/admin-crud/operation.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import {
	operationActionLabelMap,
	operationStatusConfig,
	operationStrategyConfig,
	rollOverStageLabelMap,
	rollOverStatusConfig,
} from "./operation.mappers";
import { RollOverResolveDialog } from "./roll-over-resolve-dialog";

type OperationRollOver = OperationDetail["rollOvers"][number];

const sectionTitleClass =
	"font-semibold text-muted-foreground text-xs uppercase tracking-wide";

type OperationLot = OperationDetail["lots"][number];

function Header({ operation }: { operation: OperationDetail }) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center gap-2">
				<StatusChip config={operationStatusConfig[operation.status]} />
				<StatusChip config={operationStrategyConfig[operation.strategy]} />
				<Badge variant="outline">
					{operation.includeRollOver ? "Con rollovers" : "Sin rollovers"}
				</Badge>
				<IdTooltip id={operation.id} label="Operación" />
			</div>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
				<span className="flex items-center gap-1">
					Creada <DateTooltip value={operation.createdAt} />
				</span>
				<span className="flex items-center gap-1">
					{operation.finishedAt ? (
						<>
							Finalizada <DateTooltip value={operation.finishedAt} />
						</>
					) : (
						"Sin finalizar"
					)}
				</span>
				<span>
					Ventana {formatDateTimeShort(operation.from)} —{" "}
					{formatDateTimeShort(operation.to)}
				</span>
				<span>Destino {operation.destination?.name ?? "sin destino"}</span>
				{operation.triggeredByUser ? (
					<span>por {operation.triggeredByUser.name}</span>
				) : null}
			</div>
			{operation.notes ? (
				<p className="text-sm/relaxed">{operation.notes}</p>
			) : null}
		</div>
	);
}

function Metrics({ operation }: { operation: OperationDetail }) {
	const tiles = [
		{
			label: "Elegible",
			value: operation.eligibleQuantity,
			description: `${operation.eligibleItemCount} items`,
		},
		{
			label: "Asignada",
			value: operation.assignedQuantity,
			description: `${operation.assignedItemCount} items`,
		},
		{
			label: "Rollover",
			value: operation.rollOverQuantity,
			description: `${operation.rollOverItemCount} items`,
		},
		{
			label: "Salidas",
			value: String(operation.lotCount),
			description: `${operation.supplierOrderCount} órdenes`,
		},
	];

	return (
		<section className="grid gap-3 rounded-2xl border p-3 md:grid-cols-4">
			{tiles.map((tile) => (
				<div className="flex items-start gap-3" key={tile.label}>
					<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
						<BoxesIcon className="size-4" />
					</span>
					<div className="flex flex-col gap-0.5">
						<span className="text-muted-foreground text-xs">{tile.label}</span>
						<span className="font-heading font-semibold text-lg">
							{tile.value}
						</span>
						<span className="text-muted-foreground text-xs">
							{tile.description}
						</span>
					</div>
				</div>
			))}
		</section>
	);
}

function Diagnostics({ operation }: { operation: OperationDetail }) {
	if (operation.diagnostics.length === 0) return null;

	return (
		<section className="flex flex-col gap-2 rounded-2xl border p-3">
			<h3 className={sectionTitleClass}>Diagnósticos</h3>
			{operation.diagnostics.map((diagnostic) => (
				<div className="flex flex-col gap-1" key={diagnostic.code}>
					<DiagnosticDetailChip
						code={diagnostic.code}
						severity={diagnostic.severity}
					/>
					<p className="text-xs">{diagnostic.message}</p>
				</div>
			))}
		</section>
	);
}

/**
 * Deep link into a list: `operationId` narrows it, `detailId` opens one row's
 * modal on top. The two are independent, so a row link carries both — closing
 * the modal leaves the reader on the operation's rows rather than on everything.
 */
function operationEntityHref(path: string, id: number, operationId: number) {
	return `${path}?detailId=${id}&operationId=${operationId}`;
}

/** Exits toward the lists that can show the rest of the story. */
function RelatedLinks({ operation }: { operation: OperationDetail }) {
	const links = [
		{
			key: "lots",
			label: "Lotes de la operación",
			href: `/admin/lots?operationId=${operation.id}`,
			icon: BoxesIcon,
		},
		{
			key: "supplier-orders",
			label: "Órdenes de proveedor de la operación",
			href: `/admin/supplier-orders?operationId=${operation.id}`,
			icon: ClipboardListIcon,
		},
		{
			key: "roll-overs",
			label: "Rollovers de la operación",
			href: `/admin/roll-overs?operationId=${operation.id}`,
			icon: RotateCcwIcon,
		},
		{
			key: "tracking",
			label: "Tracking de la operación",
			href: `/admin/tracking?operationId=${operation.id}`,
			icon: HistoryIcon,
		},
	];

	return (
		<section className="flex flex-wrap items-center gap-2 rounded-2xl border p-3">
			<span className="text-muted-foreground text-xs">Relacionados</span>
			{links.map((link) => {
				const Icon = link.icon;

				return (
					<Badge asChild key={link.key} variant="outline">
						<Link href={link.href}>
							<Icon data-icon="inline-start" />
							{link.label}
						</Link>
					</Badge>
				);
			})}
		</section>
	);
}

function LotSection({
	lot,
	operationId,
}: {
	lot: OperationLot;
	operationId: number;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-lg border p-3">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<Link
						className="font-medium underline-offset-4 hover:underline"
						href={operationEntityHref("/admin/lots", lot.id, operationId)}
					>
						{lot.code}
					</Link>
					<span className="text-muted-foreground text-xs">
						{lot.supplier.name}
					</span>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<StatusChip config={lotStatusConfig[lot.status]} />
					{lot.supplierOrder ? (
						<StatusChip
							config={supplierOrderStatusConfig[lot.supplierOrder.status]}
						/>
					) : (
						<Badge variant="outline">Sin orden de proveedor</Badge>
					)}
				</div>
			</div>

			{lot.lotItems.map((lotItem) => (
				<div className="flex flex-col gap-2 border-t pt-2" key={lotItem.id}>
					<div className="flex flex-wrap items-start justify-between gap-2">
						<div className="flex flex-col gap-0.5">
							<span className="font-medium text-sm">
								{lotItem.productSupplierTerms.product.name}
							</span>
							<span className="text-muted-foreground text-xs">
								{lotItem.code} · destino {lotItem.destination.name}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-sm">
								{lotItem.quantity} {lotItem.productSupplierTerms.product.unit}
							</span>
							<StatusChip config={lotItemStatusConfig[lotItem.status]} />
						</div>
					</div>

					{lotItem.cartItemLotItems.length === 0 ? (
						<p className="text-muted-foreground text-xs">
							Sin demanda asignada.
						</p>
					) : (
						<ul className="flex flex-col gap-1">
							{lotItem.cartItemLotItems.map((allocation) => (
								<li
									className="grid gap-1 rounded-lg bg-muted/30 px-2 py-1 text-xs md:grid-cols-[1fr_auto_6rem] md:items-center"
									key={allocation.id}
								>
									<span className="font-medium">
										{allocation.cartItem.cart.user.name}
									</span>
									<Link
										className="font-mono underline-offset-4 hover:underline"
										href={`/admin/carts/${allocation.cartItem.cart.id}`}
									>
										{allocation.cartItem.cart.code} / {allocation.cartItem.code}
									</Link>
									<span className="md:text-right">
										{allocation.quantity}{" "}
										{lotItem.productSupplierTerms.product.unit}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			))}
		</div>
	);
}

/**
 * Footer actions come straight from the server's `availableActions`, like the
 * supplier-order dialog: the UI never re-derives the legality rules.
 */
function ActionButton({
	action,
	enabled,
	reason,
	onClick,
}: {
	action: OperationCommandKey;
	enabled: boolean;
	reason?: string;
	onClick: () => void;
}) {
	const label = operationActionLabelMap[action];
	const destructive = action !== "rerun";

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

function DetailBody({
	operation,
	onResolveRollOver,
}: {
	operation: OperationDetail;
	onResolveRollOver: (rollOver: OperationRollOver) => void;
}) {
	return (
		<div className="flex flex-col gap-3">
			{operation.failureReason ? (
				<Alert variant="destructive">
					<AlertTitle>La ejecución falló</AlertTitle>
					<AlertDescription>{operation.failureReason}</AlertDescription>
				</Alert>
			) : null}

			<Metrics operation={operation} />
			<Diagnostics operation={operation} />
			<RelatedLinks operation={operation} />

			<Accordion
				className="w-full"
				// Lots are the substance of an operation, so they start open; the raw
				// payload stays collapsed behind "Datos técnicos".
				defaultValue={["lotes"]}
				type="multiple"
			>
				<AccordionItem value="lotes">
					<AccordionTrigger>Lotes ({operation.lots.length})</AccordionTrigger>
					<AccordionContent className="flex flex-col gap-2">
						{operation.lots.length === 0 ? (
							<p className="text-muted-foreground text-xs">
								La operación no generó lotes.
							</p>
						) : (
							operation.lots.map((lot) => (
								<LotSection key={lot.id} lot={lot} operationId={operation.id} />
							))
						)}
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="ordenes">
					<AccordionTrigger>
						Órdenes de proveedor ({operation.supplierOrders.length})
					</AccordionTrigger>
					<AccordionContent className="grid gap-2 md:grid-cols-2">
						{operation.supplierOrders.length === 0 ? (
							<p className="text-muted-foreground text-xs">
								Sin órdenes de proveedor.
							</p>
						) : (
							operation.supplierOrders.map((order) => (
								<div className="rounded-lg border p-2" key={order.id}>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<Link
											className="font-medium underline-offset-4 hover:underline"
											href={operationEntityHref(
												"/admin/supplier-orders",
												order.id,
												operation.id,
											)}
										>
											{order.code}
										</Link>
										<StatusChip
											config={supplierOrderStatusConfig[order.status]}
										/>
									</div>
									<p className="flex items-center gap-1 text-muted-foreground text-xs">
										{order.supplier.name}
										<IdTooltip id={order.id} label="Orden de proveedor" />
									</p>
								</div>
							))
						)}
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="rollovers">
					<AccordionTrigger>
						Rollovers ({operation.rollOvers.length})
					</AccordionTrigger>
					<AccordionContent className="grid gap-2 md:grid-cols-2">
						{operation.rollOvers.length === 0 ? (
							<p className="text-muted-foreground text-xs">Sin rollovers.</p>
						) : (
							operation.rollOvers.map((rollOver) => (
								<div className="rounded-lg border p-2" key={rollOver.id}>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<Link
											className="font-medium underline-offset-4 hover:underline"
											href={`/admin/carts/${rollOver.cartItem.cart.id}`}
										>
											{rollOver.cartItem.cart.code} / {rollOver.cartItem.code}
										</Link>
										<StatusChip
											config={rollOverStatusConfig[rollOver.status]}
										/>
									</div>
									<p className="text-muted-foreground text-xs">
										{rollOver.quantity}{" "}
										{rollOver.cartItem.productClientTerms.product.unit} ·{" "}
										{rollOverStageLabelMap[rollOver.stage]}
									</p>
									<p className="text-xs">{rollOver.reason}</p>
									{rollOver.status === "open" ? (
										<Button
											className="mt-2"
											onClick={() => onResolveRollOver(rollOver)}
											size="sm"
											type="button"
											variant="outline"
										>
											Resolver
										</Button>
									) : null}
								</div>
							))
						)}
					</AccordionContent>
				</AccordionItem>

				<AccordionItem value="tecnico">
					<AccordionTrigger>Datos técnicos</AccordionTrigger>
					<AccordionContent>
						<JsonPreview emptyLabel="Sin resumen" value={operation.summary} />
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}

export function OperationDetailDialog({
	open,
	operation,
	isLoading,
	errorMessage,
	onOpenChange,
	onCommand,
}: {
	open: boolean;
	operation?: OperationDetail;
	isLoading?: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
	onCommand: (operation: OperationDetail, key: OperationCommandKey) => void;
}) {
	const [resolveTarget, setResolveTarget] = useState<OperationRollOver | null>(
		null,
	);

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-6xl">
				<DialogHeader>
					<DialogTitle>
						{operation ? operation.code : "Detalle de operación"}
					</DialogTitle>
					<DialogDescription>
						{operation
							? "Demanda agregada, lotes generados y demanda que quedó fuera."
							: "Cargando detalle"}
					</DialogDescription>
					{operation ? <Header operation={operation} /> : null}
				</DialogHeader>

				{isLoading ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-24 w-full" />
						<CrudLoadingState rows={4} />
					</div>
				) : errorMessage ? (
					<CrudErrorState message={errorMessage} />
				) : operation ? (
					<DetailBody
						onResolveRollOver={setResolveTarget}
						operation={operation}
					/>
				) : null}

				<DialogFooter>
					{operation
						? operation.availableActions.map((entry) => (
								<ActionButton
									action={entry.action}
									enabled={entry.enabled}
									key={entry.action}
									onClick={() => onCommand(operation, entry.action)}
									reason={entry.reason}
								/>
							))
						: null}
					<Button onClick={() => onOpenChange(false)} type="button">
						Cerrar
					</Button>
				</DialogFooter>

				<RollOverResolveDialog
					onOpenChange={(nextOpen) => {
						if (!nextOpen) setResolveTarget(null);
					}}
					open={resolveTarget !== null}
					rollOver={
						resolveTarget
							? {
									id: resolveTarget.id,
									quantity: resolveTarget.quantity,
									cartItemCode: resolveTarget.cartItem.code,
								}
							: undefined
					}
				/>
			</DialogContent>
		</Dialog>
	);
}
