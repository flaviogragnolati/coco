"use client";

import Link from "next/link";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { DiagnosticDetailChip } from "~/features/admin/crud/_components/diagnostic-detail-chip";
import type { ShipmentDetail } from "~/shared/common/admin-crud/shipment.types";
import { shipmentStatusConfig, shipmentTypeConfig } from "./shipment.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

function JsonPreview({ value }: { value: unknown }) {
	if (value === null || value === undefined) {
		return <span className="text-muted-foreground text-xs">Sin snapshot</span>;
	}

	return (
		<pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-none border bg-muted/30 p-2 font-mono text-[11px]">
			{JSON.stringify(value, null, 2)}
		</pre>
	);
}

function Resumen({ shipment }: { shipment: ShipmentDetail }) {
	return (
		<div className="flex flex-col gap-3">
			<section className="grid gap-3 rounded-none border p-3 md:grid-cols-4">
				<div className="flex flex-col gap-1">
					<p className="text-muted-foreground text-xs">Estado</p>
					<StatusChip config={shipmentStatusConfig[shipment.status]} />
				</div>
				<div className="flex flex-col gap-1">
					<p className="text-muted-foreground text-xs">Tipo</p>
					<StatusChip config={shipmentTypeConfig[shipment.type]} />
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Carrier</p>
					<p className="font-medium">
						{shipment.carrierOrder?.code ?? "Sin orden carrier"}
					</p>
					<p className="text-muted-foreground text-xs">
						{shipment.carrierOrder?.carrier.name ?? ""}
					</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Fechas</p>
					<p className="text-xs">
						Creado {dateFormatter.format(new Date(shipment.createdAt))}
					</p>
					<p className="text-muted-foreground text-xs">
						Actualizado {dateFormatter.format(new Date(shipment.updatedAt))}
					</p>
				</div>
			</section>

			<section className="grid gap-3 rounded-none border p-3 md:grid-cols-3">
				<div>
					<p className="text-muted-foreground text-xs">Paquetes</p>
					<p className="font-medium">{shipment.packageCount}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Lineas</p>
					<p className="font-medium">{shipment.transportedQuantity}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Asignado</p>
					<p className="font-medium">{shipment.packagedAllocationQuantity}</p>
				</div>
			</section>

			<details className="rounded-none border p-3">
				<summary className="cursor-pointer font-medium text-sm">
					Snapshots destino/contacto
				</summary>
				<div className="mt-3 grid gap-3 md:grid-cols-2">
					<JsonPreview value={shipment.destinationAddressSnapshot} />
					<JsonPreview value={shipment.destinationContactSnapshot} />
				</div>
			</details>
		</div>
	);
}

function Paquetes({ shipment }: { shipment: ShipmentDetail }) {
	if (shipment.packages.length === 0) {
		return <p className="text-muted-foreground text-xs">Sin paquetes</p>;
	}

	return (
		<section className="flex flex-col gap-2">
			{shipment.packages.map((pkg) => (
				<div className="rounded-none border p-3" key={pkg.id}>
					<div className="flex flex-wrap justify-between gap-2">
						<div>
							<p className="font-medium">{pkg.name}</p>
							<p className="text-muted-foreground text-xs">
								Paquete #{pkg.id} / Estado {pkg.status}
							</p>
						</div>
						<p className="text-sm">{pkg.lineQuantity}</p>
					</div>
					<div className="mt-3 grid gap-2">
						{pkg.lines.map((line) => (
							<div className="border-t pt-2 text-xs" key={line.id}>
								<p className="font-medium">
									{line.lotItemCode} - {line.productName} - {line.quantity}
								</p>
								<div className="mt-1 flex flex-wrap gap-1">
									{line.allocations.map((allocation) => (
										<Badge key={allocation.id} variant="secondary">
											{allocation.cartItemCode} / {allocation.quantity} /{" "}
											{allocation.userName}
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

function Actividad({ shipment }: { shipment: ShipmentDetail }) {
	return (
		<section className="grid gap-3 md:grid-cols-2">
			<div className="rounded-none border p-3">
				<h3 className="font-medium text-sm">Ultimos eventos</h3>
				<div className="mt-2 flex flex-col gap-2">
					{shipment.trackingEvents.length > 0 ? (
						shipment.trackingEvents.map((event) => (
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
					{shipment.diagnostics.length > 0 ? (
						shipment.diagnostics.map((diagnostic) => (
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

export function ShipmentDetailDialog({
	open,
	shipment,
	isLoading,
	errorMessage,
	onOpenChange,
}: {
	open: boolean;
	shipment?: ShipmentDetail;
	isLoading: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>
						{shipment ? shipment.internalCode : "Detalle de envio"}
					</DialogTitle>
					<DialogDescription>
						Visualizacion read-only de paquetes, lineas, tracking y
						diagnosticos.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? <CrudLoadingState rows={4} /> : null}
				{!isLoading && errorMessage ? (
					<CrudErrorState message={errorMessage} />
				) : null}
				{!isLoading && shipment ? (
					<Tabs className="w-full" defaultValue="resumen">
						<TabsList className="flex-wrap" variant="line">
							<TabsTrigger value="resumen">Resumen</TabsTrigger>
							<TabsTrigger value="paquetes">
								Paquetes ({shipment.packages.length})
							</TabsTrigger>
							<TabsTrigger value="actividad">Actividad</TabsTrigger>
						</TabsList>
						<TabsContent value="resumen">
							<Resumen shipment={shipment} />
						</TabsContent>
						<TabsContent value="paquetes">
							<Paquetes shipment={shipment} />
						</TabsContent>
						<TabsContent value="actividad">
							<Actividad shipment={shipment} />
						</TabsContent>
					</Tabs>
				) : null}

				<DialogFooter>
					{shipment ? (
						<Button asChild size="sm" variant="outline">
							<Link
								href={`/admin/operations/tracking?shipmentId=${shipment.id}`}
							>
								Ver tracking
							</Link>
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
