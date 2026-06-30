"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { IdTooltip } from "~/features/admin/crud/_components/crud-cell-tooltips";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { DiagnosticDetailChip } from "~/features/admin/crud/_components/diagnostic-detail-chip";
import type { LotDetail } from "~/shared/common/admin-crud/lot.types";
import { lotItemStatusConfig, lotStatusConfig } from "./lot.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

function TrackingLink({ lot }: { lot: LotDetail }) {
	const params = new URLSearchParams({ lotId: String(lot.id) });
	return (
		<Button asChild size="sm" variant="outline">
			<Link href={`/admin/operations/tracking?${params.toString()}`}>
				Ver tracking
			</Link>
		</Button>
	);
}

function Resumen({ lot }: { lot: LotDetail }) {
	return (
		<div className="flex flex-col gap-3">
			<section className="grid gap-3 rounded-none border p-3 md:grid-cols-4">
				<div className="flex flex-col gap-1">
					<p className="text-muted-foreground text-xs">Estado</p>
					<StatusChip config={lotStatusConfig[lot.status]} />
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Operacion</p>
					<p className="font-medium">{lot.operation.code}</p>
					<IdTooltip id={lot.operation.id} label="Operacion" />
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Proveedor</p>
					<p className="font-medium">{lot.supplier.name}</p>
					<p className="text-muted-foreground text-xs">
						{lot.supplierOrder?.code ?? "Sin orden proveedor"}
					</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Fechas</p>
					<p className="text-xs">
						Creado {dateFormatter.format(new Date(lot.createdAt))}
					</p>
					<p className="text-muted-foreground text-xs">
						Actualizado {dateFormatter.format(new Date(lot.updatedAt))}
					</p>
				</div>
			</section>

			<section className="grid gap-3 rounded-none border p-3 md:grid-cols-4">
				<div>
					<p className="text-muted-foreground text-xs">Lineas</p>
					<p className="font-medium">{lot.lotItemQuantity}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Demanda</p>
					<p className="font-medium">{lot.demandAllocationQuantity}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Empaquetado</p>
					<p className="font-medium">{lot.packagedQuantity}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Pendiente</p>
					<p className="font-medium">{lot.pendingQuantity}</p>
				</div>
			</section>
		</div>
	);
}

function Lineas({ lot }: { lot: LotDetail }) {
	if (lot.lotItems.length === 0) {
		return <p className="text-muted-foreground text-xs">Sin lineas de lote</p>;
	}

	return (
		<section className="flex flex-col gap-2">
			{lot.lotItems.map((item) => (
				<div className="rounded-none border p-3" key={item.id}>
					<div className="flex flex-wrap justify-between gap-2">
						<div className="flex flex-col gap-1">
							<p className="font-medium">
								{item.code} - {item.product.name}
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<StatusChip config={lotItemStatusConfig[item.status]} />
								<span className="text-muted-foreground text-xs">
									Destino {item.destination.name}
								</span>
							</div>
						</div>
						<p className="text-sm">
							{item.quantity} {item.product.unit}
						</p>
					</div>
					<div className="mt-3 grid gap-2">
						{item.demandAllocations.map((allocation) => (
							<div
								className="grid gap-2 border-t pt-2 text-xs md:grid-cols-[1fr_8rem_8rem]"
								key={allocation.id}
							>
								<Link
									className="font-medium underline-offset-4 hover:underline"
									href={`/admin/operations/tracking?cartItemId=${allocation.cartItem.id}`}
								>
									{allocation.cartItem.cart.code} / {allocation.cartItem.code}
								</Link>
								<span>{allocation.quantity}</span>
								<span>{allocation.cartItem.cart.user.email}</span>
							</div>
						))}
					</div>
				</div>
			))}
		</section>
	);
}

function Actividad({ lot }: { lot: LotDetail }) {
	return (
		<section className="grid gap-3 md:grid-cols-2">
			<div className="rounded-none border p-3">
				<h3 className="font-medium text-sm">Ultimos eventos</h3>
				<div className="mt-2 flex flex-col gap-2">
					{lot.trackingEvents.length > 0 ? (
						lot.trackingEvents.map((event) => (
							<p className="text-xs" key={event.id}>
								{dateFormatter.format(new Date(event.createdAt))} -{" "}
								{event.label} - {event.cartItemCode}
							</p>
						))
					) : (
						<p className="text-muted-foreground text-xs">Sin eventos</p>
					)}
				</div>
			</div>
			<div className="rounded-none border p-3">
				<h3 className="font-medium text-sm">Diagnosticos</h3>
				<div className="mt-2 flex flex-col gap-2">
					{lot.diagnostics.length > 0 ? (
						lot.diagnostics.map((diagnostic) => (
							<div className="text-xs" key={diagnostic.code}>
								<DiagnosticDetailChip
									code={diagnostic.code}
									severity={diagnostic.severity}
								/>
								<p className="mt-1">{diagnostic.message}</p>
							</div>
						))
					) : (
						<p className="text-muted-foreground text-xs">Sin diagnosticos</p>
					)}
				</div>
			</div>
		</section>
	);
}

export function LotDetailDialog({
	open,
	lot,
	isLoading,
	errorMessage,
	onOpenChange,
}: {
	open: boolean;
	lot?: LotDetail;
	isLoading: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>{lot ? lot.code : "Detalle de lote"}</DialogTitle>
					<DialogDescription>
						Visualizacion read-only de lineas, demanda, empaque y diagnosticos.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? <CrudLoadingState rows={4} /> : null}
				{!isLoading && errorMessage ? (
					<CrudErrorState message={errorMessage} />
				) : null}
				{!isLoading && lot ? (
					<Tabs className="w-full" defaultValue="resumen">
						<TabsList className="flex-wrap" variant="line">
							<TabsTrigger value="resumen">Resumen</TabsTrigger>
							<TabsTrigger value="lineas">
								Lineas ({lot.lotItems.length})
							</TabsTrigger>
							<TabsTrigger value="actividad">Actividad</TabsTrigger>
						</TabsList>
						<TabsContent value="resumen">
							<Resumen lot={lot} />
						</TabsContent>
						<TabsContent value="lineas">
							<Lineas lot={lot} />
						</TabsContent>
						<TabsContent value="actividad">
							<Actividad lot={lot} />
						</TabsContent>
					</Tabs>
				) : null}

				<DialogFooter>{lot ? <TrackingLink lot={lot} /> : null}</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
