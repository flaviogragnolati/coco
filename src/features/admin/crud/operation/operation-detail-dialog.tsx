"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import type { OperationDetail } from "~/shared/common/admin-crud/operation.types";
import {
	operationStatusConfig,
	operationStrategyLabelMap,
} from "./operation.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

function IdRef({ id, label }: { id: number | string; label: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="w-fit cursor-help font-mono text-muted-foreground text-xs">
					#{id}
				</span>
			</TooltipTrigger>
			<TooltipContent>
				{label} #{id}
			</TooltipContent>
		</Tooltip>
	);
}

function JsonPreview({ value }: { value: unknown }) {
	if (value === null || value === undefined) {
		return <span className="text-muted-foreground text-xs">Sin resumen</span>;
	}

	return (
		<pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-none border bg-muted/30 p-2 font-mono text-[11px]">
			{JSON.stringify(value, null, 2)}
		</pre>
	);
}

function SummaryGrid({ operation }: { operation: OperationDetail }) {
	const items = [
		[
			"Elegible",
			operation.eligibleQuantity,
			`${operation.eligibleItemCount} items`,
		],
		[
			"Asignada",
			operation.assignedQuantity,
			`${operation.assignedItemCount} items`,
		],
		[
			"Rollover",
			operation.rollOverQuantity,
			`${operation.rollOverItemCount} items`,
		],
		[
			"Salidas",
			String(operation.lotCount),
			`${operation.supplierOrderCount} ordenes`,
		],
	] as const;

	return (
		<section className="grid gap-3 rounded-none border p-3 md:grid-cols-4">
			{items.map(([label, value, description]) => (
				<div className="flex flex-col gap-1" key={label}>
					<span className="text-muted-foreground text-xs">{label}</span>
					<span className="font-medium text-lg">{value}</span>
					<span className="text-muted-foreground text-xs">{description}</span>
				</div>
			))}
		</section>
	);
}

function ConfigGrid({ operation }: { operation: OperationDetail }) {
	return (
		<section className="grid gap-3 rounded-none border p-3 md:grid-cols-4">
			<div className="flex flex-col gap-1">
				<span className="text-muted-foreground text-xs">Estado</span>
				<StatusChip config={operationStatusConfig[operation.status]} />
				{operation.failureReason ? (
					<span className="text-destructive text-xs">
						{operation.failureReason}
					</span>
				) : null}
			</div>
			<div className="flex flex-col gap-1">
				<span className="text-muted-foreground text-xs">Destino</span>
				<span className="font-medium">
					{operation.destination?.name ?? "Sin destino"}
				</span>
				<span className="text-muted-foreground text-xs">
					{operation.destination ? `#${operation.destination.id}` : ""}
				</span>
			</div>
			<div className="flex flex-col gap-1">
				<span className="text-muted-foreground text-xs">Ventana</span>
				<span>{dateFormatter.format(operation.from)}</span>
				<span className="text-muted-foreground text-xs">
					{dateFormatter.format(operation.to)}
				</span>
			</div>
			<div className="flex flex-col gap-1">
				<span className="text-muted-foreground text-xs">Estrategia</span>
				<span className="font-medium">
					{operationStrategyLabelMap[operation.strategy]}
				</span>
				<span className="text-muted-foreground text-xs">
					{operation.includeRollOver ? "Con rollovers" : "Sin rollovers"}
				</span>
			</div>
		</section>
	);
}

function SupplierOrders({ operation }: { operation: OperationDetail }) {
	if (operation.supplierOrders.length === 0) {
		return (
			<section className="rounded-none border p-3">
				<h3 className="font-medium text-sm">Ordenes proveedor</h3>
				<p className="text-muted-foreground text-xs">Sin ordenes proveedor</p>
			</section>
		);
	}

	return (
		<section className="flex flex-col gap-2 rounded-none border p-3">
			<h3 className="font-medium text-sm">Ordenes proveedor</h3>
			<div className="grid gap-2 md:grid-cols-2">
				{operation.supplierOrders.map((order) => (
					<div className="rounded-none border bg-muted/20 p-2" key={order.id}>
						<div className="flex items-center justify-between gap-2">
							<span className="font-medium">{order.code}</span>
							<Badge variant="secondary">{order.status}</Badge>
						</div>
						<p className="flex items-center gap-1 text-muted-foreground text-xs">
							{order.supplier.name} <IdRef id={order.id} label="Orden" />
						</p>
					</div>
				))}
			</div>
		</section>
	);
}

function Lots({ operation }: { operation: OperationDetail }) {
	if (operation.lots.length === 0) {
		return (
			<section className="rounded-none border p-3">
				<h3 className="font-medium text-sm">Lotes</h3>
				<p className="text-muted-foreground text-xs">Sin lotes</p>
			</section>
		);
	}

	return (
		<section className="flex flex-col gap-2 rounded-none border p-3">
			<h3 className="font-medium text-sm">Lotes</h3>
			{operation.lots.map((lot) => (
				<div
					className="flex flex-col gap-2 rounded-none border bg-muted/20 p-2"
					key={lot.id}
				>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div>
							<p className="font-medium">{lot.code}</p>
							<p className="text-muted-foreground text-xs">
								{lot.supplier.name} / {lot.status}
							</p>
						</div>
						{lot.supplierOrder ? (
							<Badge variant="outline">{lot.supplierOrder.code}</Badge>
						) : null}
					</div>
					<div className="grid gap-2">
						{lot.lotItems.map((lotItem) => (
							<div
								className="rounded-none border bg-background p-2"
								key={lotItem.id}
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div>
										<p className="font-medium">
											{lotItem.productSupplierTerms.product.name}
										</p>
										<p className="text-muted-foreground text-xs">
											{lotItem.code} / {lotItem.quantity}{" "}
											{lotItem.productSupplierTerms.product.unit}
										</p>
									</div>
									<Badge variant="secondary">{lotItem.status}</Badge>
								</div>
								<div className="mt-2 flex flex-wrap gap-1">
									{lotItem.cartItemLotItems.map((allocation) => (
										<Badge
											className="h-auto whitespace-normal py-1"
											key={allocation.id}
											variant="outline"
										>
											{allocation.cartItem.code}: {allocation.quantity}
										</Badge>
									))}
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</section>
	);
}

function RollOvers({ operation }: { operation: OperationDetail }) {
	if (operation.rollOvers.length === 0) {
		return (
			<section className="rounded-none border p-3">
				<h3 className="font-medium text-sm">Rollovers</h3>
				<p className="text-muted-foreground text-xs">Sin rollovers</p>
			</section>
		);
	}

	return (
		<section className="flex flex-col gap-2 rounded-none border p-3">
			<h3 className="font-medium text-sm">Rollovers</h3>
			<div className="grid gap-2 md:grid-cols-2">
				{operation.rollOvers.map((rollOver) => (
					<div
						className="rounded-none border bg-muted/20 p-2"
						key={rollOver.id}
					>
						<div className="flex items-center justify-between gap-2">
							<span className="font-medium">{rollOver.cartItem.code}</span>
							<Badge variant="outline">{rollOver.status}</Badge>
						</div>
						<p className="text-muted-foreground text-xs">
							{rollOver.quantity}{" "}
							{rollOver.cartItem.productClientTerms.product.unit} /{" "}
							{rollOver.stage}
						</p>
						<p className="text-xs">{rollOver.reason}</p>
					</div>
				))}
			</div>
		</section>
	);
}

export function OperationDetailDialog({
	open,
	operation,
	isLoading,
	errorMessage,
	onOpenChange,
}: {
	open: boolean;
	operation?: OperationDetail;
	isLoading?: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>
						{operation ? operation.code : "Detalle de operacion"}
					</DialogTitle>
					<DialogDescription>
						{operation
							? `Ejecutada el ${dateFormatter.format(operation.createdAt)}`
							: "Cargando detalle"}
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-24 w-full" />
						<CrudLoadingState rows={4} />
					</div>
				) : errorMessage ? (
					<CrudErrorState message={errorMessage} />
				) : operation ? (
					<Tabs className="w-full" defaultValue="resumen">
						<TabsList className="flex-wrap" variant="line">
							<TabsTrigger value="resumen">Resumen</TabsTrigger>
							<TabsTrigger value="lotes">
								Lotes ({operation.lots.length})
							</TabsTrigger>
							<TabsTrigger value="ordenes">
								Ordenes ({operation.supplierOrders.length})
							</TabsTrigger>
							<TabsTrigger value="rollovers">
								Rollovers ({operation.rollOvers.length})
							</TabsTrigger>
							<TabsTrigger value="tecnico">Tecnico</TabsTrigger>
						</TabsList>
						<TabsContent className="flex flex-col gap-3" value="resumen">
							<SummaryGrid operation={operation} />
							<ConfigGrid operation={operation} />
						</TabsContent>
						<TabsContent value="lotes">
							<Lots operation={operation} />
						</TabsContent>
						<TabsContent value="ordenes">
							<SupplierOrders operation={operation} />
						</TabsContent>
						<TabsContent value="rollovers">
							<RollOvers operation={operation} />
						</TabsContent>
						<TabsContent value="tecnico">
							<section className="flex flex-col gap-2 rounded-none border p-3">
								<h3 className="font-medium text-sm">Resumen tecnico</h3>
								<JsonPreview value={operation.summary} />
							</section>
						</TabsContent>
					</Tabs>
				) : null}

				<DialogFooter>
					<Button disabled variant="outline">
						Cancelar
					</Button>
					<Button disabled variant="outline">
						Reejecutar
					</Button>
					<Button disabled variant="destructive">
						Eliminar
					</Button>
					<Button onClick={() => onOpenChange(false)} type="button">
						Cerrar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
