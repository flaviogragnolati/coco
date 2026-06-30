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
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { DiagnosticDetailChip } from "~/features/admin/crud/_components/diagnostic-detail-chip";
import type { PackageDetail } from "~/shared/common/admin-crud/package.types";
import {
	packageLotItemStatusConfig,
	packageStatusConfig,
} from "./package.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

function Resumen({ pkg }: { pkg: PackageDetail }) {
	return (
		<div className="flex flex-col gap-3">
			<section className="grid gap-3 rounded-none border p-3 md:grid-cols-4">
				<div className="flex flex-col gap-1">
					<p className="text-muted-foreground text-xs">Estado</p>
					<StatusChip config={packageStatusConfig[pkg.status]} />
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Tracking</p>
					<p className="font-medium">{pkg.trackingCode ?? "Sin codigo"}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Envio</p>
					<p className="font-medium">
						{pkg.shipment?.internalCode ?? "Sin envio"}
					</p>
					<p className="text-muted-foreground text-xs">
						{pkg.shipment?.name ?? ""}
					</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Fechas</p>
					<p className="text-xs">
						Creado {dateFormatter.format(new Date(pkg.createdAt))}
					</p>
					<p className="text-muted-foreground text-xs">
						Actualizado {dateFormatter.format(new Date(pkg.updatedAt))}
					</p>
				</div>
			</section>

			<section className="grid gap-3 rounded-none border p-3 md:grid-cols-3">
				<div>
					<p className="text-muted-foreground text-xs">Lineas</p>
					<p className="font-medium">{pkg.packageLineQuantity}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Asignado</p>
					<p className="font-medium">{pkg.packagedAllocationQuantity}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">Sin asignar</p>
					<p className="font-medium">{pkg.unallocatedQuantity}</p>
				</div>
			</section>
		</div>
	);
}

function Lineas({ pkg }: { pkg: PackageDetail }) {
	if (pkg.packageLines.length === 0) {
		return (
			<p className="text-muted-foreground text-xs">Sin lineas de paquete</p>
		);
	}

	return (
		<section className="flex flex-col gap-2">
			{pkg.packageLines.map((line) => (
				<div className="rounded-none border p-3" key={line.id}>
					<div className="flex flex-wrap justify-between gap-2">
						<div className="flex flex-col gap-1">
							<p className="font-medium">
								{line.lotItem.code} - {line.lotItem.product.name}
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<StatusChip config={packageLotItemStatusConfig[line.status]} />
								<span className="text-muted-foreground text-xs">
									Lote {line.lotItem.lot.code}
								</span>
							</div>
						</div>
						<p className="text-sm">
							{line.quantity} {line.lotItem.product.unit}
						</p>
					</div>
					<div className="mt-3 grid gap-2">
						{line.packageAllocations.map((allocation) => (
							<div
								className="grid gap-2 border-t pt-2 text-xs md:grid-cols-[1fr_8rem_8rem]"
								key={allocation.id}
							>
								<Link
									className="font-medium underline-offset-4 hover:underline"
									href={`/admin/operations/tracking?cartItemId=${allocation.demandAllocation.cartItem.id}`}
								>
									{allocation.demandAllocation.cartItem.cart.code} /{" "}
									{allocation.demandAllocation.cartItem.code}
								</Link>
								<span>{allocation.quantity}</span>
								<span>
									{allocation.demandAllocation.cartItem.cart.user.email}
								</span>
							</div>
						))}
					</div>
				</div>
			))}
		</section>
	);
}

function Actividad({ pkg }: { pkg: PackageDetail }) {
	return (
		<section className="grid gap-3 md:grid-cols-2">
			<div className="rounded-none border p-3">
				<h3 className="font-medium text-sm">Ultimos eventos</h3>
				<div className="mt-2 flex flex-col gap-2">
					{pkg.trackingEvents.length > 0 ? (
						pkg.trackingEvents.map((event) => (
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
					{pkg.diagnostics.length > 0 ? (
						pkg.diagnostics.map((diagnostic) => (
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

export function PackageDetailDialog({
	open,
	pkg,
	isLoading,
	errorMessage,
	onOpenChange,
}: {
	open: boolean;
	pkg?: PackageDetail;
	isLoading: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>{pkg ? pkg.name : "Detalle de paquete"}</DialogTitle>
					<DialogDescription>
						Visualizacion read-only de lineas, asignaciones, envio y
						diagnosticos.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? <CrudLoadingState rows={4} /> : null}
				{!isLoading && errorMessage ? (
					<CrudErrorState message={errorMessage} />
				) : null}
				{!isLoading && pkg ? (
					<Tabs className="w-full" defaultValue="resumen">
						<TabsList className="flex-wrap" variant="line">
							<TabsTrigger value="resumen">Resumen</TabsTrigger>
							<TabsTrigger value="lineas">
								Lineas ({pkg.packageLines.length})
							</TabsTrigger>
							<TabsTrigger value="actividad">Actividad</TabsTrigger>
						</TabsList>
						<TabsContent value="resumen">
							<Resumen pkg={pkg} />
						</TabsContent>
						<TabsContent value="lineas">
							<Lineas pkg={pkg} />
						</TabsContent>
						<TabsContent value="actividad">
							<Actividad pkg={pkg} />
						</TabsContent>
					</Tabs>
				) : null}

				<DialogFooter>
					{pkg ? (
						<Button asChild size="sm" variant="outline">
							<Link href={`/admin/operations/tracking?packageId=${pkg.id}`}>
								Ver tracking
							</Link>
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
