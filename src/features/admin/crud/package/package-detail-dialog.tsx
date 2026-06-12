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
import {
	CrudErrorState,
	CrudLoadingState,
} from "~/features/admin/crud/_components/crud-state";
import type { PackageDetail } from "~/shared/common/admin-crud/package.types";
import { packageStatusLabelMap } from "./package.mappers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
	dateStyle: "short",
	timeStyle: "short",
});

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
					<div className="flex flex-col gap-4">
						<section className="grid gap-3 rounded-none border p-3 md:grid-cols-4">
							<div>
								<p className="text-muted-foreground text-xs">Estado</p>
								<Badge variant="outline">
									{packageStatusLabelMap[pkg.status]}
								</Badge>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Tracking</p>
								<p className="font-medium">
									{pkg.trackingCode ?? "Sin codigo"}
								</p>
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

						<section className="flex flex-col gap-2">
							<h3 className="font-medium text-sm">Lineas de paquete</h3>
							{pkg.packageLines.map((line) => (
								<div className="rounded-none border p-3" key={line.id}>
									<div className="flex flex-wrap justify-between gap-2">
										<div>
											<p className="font-medium">
												{line.lotItem.code} - {line.lotItem.product.name}
											</p>
											<p className="text-muted-foreground text-xs">
												Lote {line.lotItem.lot.code} / Estado {line.status}
											</p>
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
												<Badge
													variant={
														diagnostic.severity === "critical"
															? "destructive"
															: "secondary"
													}
												>
													{diagnostic.code}
												</Badge>
												<p className="mt-1">{diagnostic.message}</p>
											</div>
										))
									) : (
										<p className="text-muted-foreground text-xs">
											Sin diagnosticos
										</p>
									)}
								</div>
							</div>
						</section>
					</div>
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
