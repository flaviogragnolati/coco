"use client";

import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CrudAvailableAction } from "~/features/admin/crud/_components/crud-available-action";
import {
	DetailDatesField,
	DetailDiagnosticList,
	DetailDisclosure,
	DetailEmpty,
	DetailEventList,
	DetailField,
	DetailGrid,
	DetailItem,
	DetailMetrics,
	DetailSection,
} from "~/features/admin/crud/_components/crud-detail";
import { CrudDetailDialogShell } from "~/features/admin/crud/_components/crud-detail-dialog-shell";
import { JsonPreview } from "~/features/admin/crud/_components/crud-json-preview";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import {
	packageLegLabelMap,
	packageStatusConfig,
} from "~/features/admin/crud/package/package.mappers";
import type {
	ShipmentCommandKey,
	ShipmentDetail,
} from "~/shared/common/admin-crud/shipment.types";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";
import {
	deliveryModeLabelMap,
	shipmentActionLabelMap,
	shipmentStatusConfig,
	shipmentTypeConfig,
} from "./shipment.mappers";

function Resumen({ shipment }: { shipment: ShipmentDetail }) {
	return (
		<div className="flex flex-col gap-3">
			<DetailMetrics
				columns={3}
				items={[
					{ label: "Paquetes", value: shipment.packageCount },
					{ label: "Líneas", value: shipment.transportedQuantity },
					{ label: "Asignado", value: shipment.packagedAllocationQuantity },
				]}
			/>

			<DetailSection title="Datos del envío">
				<DetailGrid columns={3}>
					{shipment.type === "endUserDelivery" ? (
						<DetailField hint={shipment.pickupPoint?.name} label="Entrega">
							{shipment.deliveryMode ? (
								deliveryModeLabelMap[shipment.deliveryMode]
							) : (
								<span className="font-normal text-muted-foreground">
									Sin modo de entrega
								</span>
							)}
						</DetailField>
					) : null}
					<DetailField
						hint={shipment.carrierOrder?.carrier.name}
						label="Orden de transporte"
					>
						{shipment.carrierOrder?.code ?? (
							<span className="font-normal text-muted-foreground">
								Sin orden de transporte
							</span>
						)}
					</DetailField>
					<DetailDatesField
						createdAt={shipment.createdAt}
						updatedAt={shipment.updatedAt}
					/>
				</DetailGrid>
			</DetailSection>

			<DetailDisclosure title="Datos técnicos: destino y contacto guardados">
				<div className="grid gap-3 md:grid-cols-2">
					<JsonPreview
						emptyLabel="Sin datos de destino"
						value={shipment.destinationAddressSnapshot}
					/>
					<JsonPreview
						emptyLabel="Sin datos de contacto"
						value={shipment.destinationContactSnapshot}
					/>
				</div>
			</DetailDisclosure>
		</div>
	);
}

/** The shipment payload types the package status as a plain string. */
function PackageStatusChip({ status }: { status: string }) {
	const config = (packageStatusConfig as Partial<Record<string, StatusConfig>>)[
		status
	];

	return config ? (
		<StatusChip config={config} />
	) : (
		<span className="text-muted-foreground text-xs">{status}</span>
	);
}

function Paquetes({ shipment }: { shipment: ShipmentDetail }) {
	if (shipment.packages.length === 0) {
		return <DetailEmpty>Sin paquetes</DetailEmpty>;
	}

	return (
		<section className="flex flex-col gap-2">
			{shipment.packages.map((pkg) => (
				<DetailItem key={pkg.id}>
					<div className="flex flex-wrap items-start justify-between gap-2">
						<div className="flex flex-col gap-1.5">
							<p className="font-medium">{pkg.name}</p>
							<div className="flex flex-wrap items-center gap-2">
								<PackageStatusChip status={pkg.status} />
								<span className="text-muted-foreground text-xs">
									Paquete <span className="font-mono">#{pkg.id}</span> ·{" "}
									{packageLegLabelMap[pkg.leg]}
								</span>
							</div>
						</div>
						<p className="font-semibold text-sm tabular-nums">
							{pkg.lineQuantity}
						</p>
					</div>
					{pkg.lines.length > 0 ? (
						<ul className="mt-3 flex flex-col divide-y border-t text-xs">
							{pkg.lines.map((line) => (
								<li
									className="flex flex-col gap-1.5 py-2 last:pb-0"
									key={line.id}
								>
									<div className="flex flex-wrap items-baseline justify-between gap-2">
										<p className="font-medium">
											<span className="font-mono text-muted-foreground">
												{line.lotItemCode}
											</span>{" "}
											{line.productName}
										</p>
										<span className="tabular-nums">{line.quantity}</span>
									</div>
									{line.allocations.length > 0 ? (
										<div className="flex flex-wrap gap-1">
											{line.allocations.map((allocation) => (
												<Badge key={allocation.id} variant="secondary">
													<span className="font-mono">
														{allocation.cartItemCode}
													</span>{" "}
													· {allocation.quantity} · {allocation.userName}
												</Badge>
											))}
										</div>
									) : null}
								</li>
							))}
						</ul>
					) : null}
				</DetailItem>
			))}
		</section>
	);
}

function Actividad({ shipment }: { shipment: ShipmentDetail }) {
	return (
		<div className="grid gap-3 md:grid-cols-2">
			<DetailSection title="Últimos eventos">
				<DetailEventList events={shipment.trackingEvents} />
			</DetailSection>
			<DetailSection title="Diagnósticos">
				<DetailDiagnosticList diagnostics={shipment.diagnostics} />
			</DetailSection>
		</div>
	);
}

export function ShipmentDetailDialog({
	open,
	shipment,
	isLoading,
	errorMessage,
	onOpenChange,
	onAction,
}: {
	open: boolean;
	shipment?: ShipmentDetail;
	isLoading: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
	onAction: (action: ShipmentCommandKey) => void;
}) {
	return (
		<CrudDetailDialogShell
			description="Paquetes transportados, líneas, tracking y diagnósticos del envío."
			errorMessage={errorMessage}
			eyebrow="Envío"
			footer={
				shipment ? (
					<>
						<Button asChild variant="outline">
							<Link href={`/admin/tracking?shipmentId=${shipment.id}`}>
								Ver tracking
							</Link>
						</Button>
						{shipment.availableActions.map((entry) => (
							<CrudAvailableAction
								destructive={
									entry.action === "markDelayed" ||
									entry.action === "markFailed"
								}
								enabled={entry.enabled}
								key={entry.action}
								label={shipmentActionLabelMap[entry.action]}
								onClick={() => onAction(entry.action)}
								reason={entry.reason}
							/>
						))}
					</>
				) : null
			}
			isLoading={isLoading}
			onOpenChange={onOpenChange}
			open={open}
			status={
				shipment ? (
					<>
						<StatusChip config={shipmentStatusConfig[shipment.status]} />
						<StatusChip config={shipmentTypeConfig[shipment.type]} />
					</>
				) : null
			}
			title={shipment ? shipment.internalCode : "Detalle de envío"}
		>
			{shipment ? (
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
		</CrudDetailDialogShell>
	);
}
