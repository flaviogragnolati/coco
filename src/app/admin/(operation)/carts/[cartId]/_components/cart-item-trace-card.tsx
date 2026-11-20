import { Badge } from "~/components/ui/badge";
import {
	DetailDisclosure,
	DetailEmpty,
	DetailField,
	DetailGrid,
	DetailItem,
	DetailSection,
	DetailSectionTitle,
} from "~/features/admin/crud/_components/crud-detail";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import { OperationalDiagnosticBadge } from "~/features/admin/crud/_components/operational-diagnostic-badge";
import {
	lotItemStatusConfig,
	lotStatusConfig,
} from "~/features/admin/crud/lot/lot.mappers";
import {
	operationStatusConfig,
	operationStrategyLabelMap,
} from "~/features/admin/crud/operation/operation.mappers";
import {
	cartItemStatusConfig,
	fulfillmentStatusConfig,
} from "~/features/admin/crud/operations-cart/operations-cart.mappers";
import {
	packageLotItemStatusConfig,
	packageStatusConfig,
} from "~/features/admin/crud/package/package.mappers";
import {
	rollOverStageLabelMap,
	rollOverStatusConfig,
} from "~/features/admin/crud/roll-over/roll-over.mappers";
import {
	shipmentStatusConfig,
	shipmentTypeLabelMap,
} from "~/features/admin/crud/shipment/shipment.mappers";
import { TrackingTimeline } from "~/features/admin/crud/tracking/tracking-timeline.parts";
import type {
	CartTraceabilityAllocation,
	CartTraceabilityItem,
	CartTraceabilityPackaging,
	CartTraceabilityRollOver,
} from "~/shared/common/cart-traceability.types";
import { DiagnosticList } from "./cart-item-diagnostics";

function PackagingRow({ packaging }: { packaging: CartTraceabilityPackaging }) {
	return (
		<li className="rounded-xl bg-muted/40 px-3 py-2.5">
			<DetailGrid columns={3}>
				<DetailField
					hint={
						packaging.package.trackingCode ? (
							<span className="font-mono">
								{packaging.package.trackingCode}
							</span>
						) : null
					}
					label="Paquete"
				>
					<span className="flex flex-wrap items-center gap-1.5">
						{packaging.package.name}
						<StatusChip
							config={packageStatusConfig[packaging.package.status]}
						/>
					</span>
				</DetailField>
				<DetailField
					hint={<span className="font-mono">#{packaging.packageLine.id}</span>}
					label="Línea de paquete"
				>
					<span className="flex flex-wrap items-center gap-1.5">
						<span className="tabular-nums">
							{packaging.packageLine.quantity}
						</span>
						<StatusChip
							config={packageLotItemStatusConfig[packaging.packageLine.status]}
						/>
					</span>
				</DetailField>
				<DetailField
					hint={
						packaging.shipment
							? shipmentTypeLabelMap[packaging.shipment.type]
							: null
					}
					label="Envío"
				>
					{packaging.shipment ? (
						<span className="flex flex-wrap items-center gap-1.5">
							<span className="font-mono">
								{packaging.shipment.internalCode}
							</span>
							<StatusChip
								config={shipmentStatusConfig[packaging.shipment.status]}
							/>
						</span>
					) : (
						<span className="font-normal text-muted-foreground">Sin envío</span>
					)}
				</DetailField>
			</DetailGrid>
		</li>
	);
}

function AllocationCard({
	allocation,
}: {
	allocation: CartTraceabilityAllocation;
}) {
	const { lotItem } = allocation;
	const { lot } = lotItem;

	return (
		<DetailItem className="flex flex-col gap-3">
			<DetailGrid columns={4}>
				<DetailField
					hint={<span className="font-mono">#{allocation.id}</span>}
					label="Demanda asignada"
				>
					<span className="tabular-nums">{allocation.quantity}</span>
				</DetailField>
				<DetailField hint={lotItem.product.name} label="Línea de lote">
					<span className="flex flex-wrap items-center gap-1.5">
						<span className="font-mono">{lotItem.code}</span>
						<StatusChip config={lotItemStatusConfig[lotItem.status]} />
					</span>
				</DetailField>
				<DetailField hint={lot.supplierName} label="Lote">
					<span className="flex flex-wrap items-center gap-1.5">
						<span className="font-mono">{lot.code}</span>
						<StatusChip config={lotStatusConfig[lot.status]} />
					</span>
				</DetailField>
				<DetailField
					hint={`Estrategia ${operationStrategyLabelMap[lot.operation.strategy]}`}
					label="Operación"
				>
					<span className="flex flex-wrap items-center gap-1.5">
						<span className="font-mono">{lot.operation.code}</span>
						<StatusChip config={operationStatusConfig[lot.operation.status]} />
					</span>
				</DetailField>
			</DetailGrid>

			<div className="flex flex-col gap-2 border-t pt-3">
				<span className="text-muted-foreground text-xs">Empaque</span>
				{allocation.packaging.length > 0 ? (
					<ul className="flex flex-col gap-2">
						{allocation.packaging.map((packaging) => (
							<PackagingRow key={packaging.id} packaging={packaging} />
						))}
					</ul>
				) : (
					<DetailEmpty>Sin empaque todavía</DetailEmpty>
				)}
			</div>
		</DetailItem>
	);
}

function RollOverRow({ rollOver }: { rollOver: CartTraceabilityRollOver }) {
	return (
		<DetailItem>
			<DetailGrid columns={4}>
				<DetailField
					hint={rollOverStageLabelMap[rollOver.stage]}
					label="Rollover"
				>
					<span className="flex flex-wrap items-center gap-1.5">
						<span className="font-mono">#{rollOver.id}</span>
						<StatusChip config={rollOverStatusConfig[rollOver.status]} />
					</span>
				</DetailField>
				<DetailField label="Cantidad">
					<span className="tabular-nums">{rollOver.quantity}</span>
				</DetailField>
				<DetailField label="Operación">
					<span className="flex flex-wrap items-center gap-1.5">
						<span className="font-mono">{rollOver.operation.code}</span>
						<StatusChip
							config={operationStatusConfig[rollOver.operation.status]}
						/>
					</span>
				</DetailField>
				<DetailField label="Motivo">
					<span className="font-normal">{rollOver.reason}</span>
				</DetailField>
			</DetailGrid>
		</DetailItem>
	);
}

export function CartItemTraceCard({ item }: { item: CartTraceabilityItem }) {
	return (
		<DetailSection>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="flex flex-col gap-1.5">
					<p className="font-medium">
						<span className="font-mono text-muted-foreground text-xs">
							{item.code}
						</span>{" "}
						{item.product.name}
					</p>
					<div className="flex flex-wrap items-center gap-1.5">
						<StatusChip config={cartItemStatusConfig[item.status]} />
						<StatusChip
							config={fulfillmentStatusConfig[item.fulfillmentStatus]}
						/>
						{item.deleted ? (
							<Badge variant="destructive">Eliminado</Badge>
						) : null}
					</div>
				</div>
				<div className="flex flex-col items-end gap-1.5">
					<p className="font-semibold text-sm tabular-nums">
						{item.quantity}{" "}
						<span className="font-normal text-muted-foreground">
							{item.product.unit}
						</span>
					</p>
					<OperationalDiagnosticBadge
						count={item.diagnostics.length}
						severity={item.highestDiagnosticSeverity}
					/>
				</div>
			</div>

			<DetailDisclosure
				className="rounded-xl p-3"
				title="Ver linaje, diagnósticos e historial"
			>
				<div className="grid gap-4">
					<div className="flex flex-col gap-2">
						<DetailSectionTitle>Linaje de fulfillment</DetailSectionTitle>
						{item.allocations.length > 0 ? (
							<div className="flex flex-col gap-2">
								{item.allocations.map((allocation) => (
									<AllocationCard allocation={allocation} key={allocation.id} />
								))}
							</div>
						) : (
							<DetailEmpty>
								Sin linaje todavía. El ítem espera agregación en una operación.
							</DetailEmpty>
						)}
					</div>

					{item.rollOvers.length > 0 ? (
						<div className="flex flex-col gap-2">
							<DetailSectionTitle>Rollovers</DetailSectionTitle>
							<div className="flex flex-col gap-2">
								{item.rollOvers.map((rollOver) => (
									<RollOverRow key={rollOver.id} rollOver={rollOver} />
								))}
							</div>
						</div>
					) : null}

					<div className="flex flex-col gap-2">
						<DetailSectionTitle>Diagnósticos</DetailSectionTitle>
						<DiagnosticList
							diagnostics={item.diagnostics}
							emptyLabel="Sin diagnósticos para este ítem."
						/>
					</div>

					<div className="flex flex-col gap-2">
						<DetailSectionTitle>Historial del ítem</DetailSectionTitle>
						<TrackingTimeline
							emptyLabel="Este ítem todavía no tiene eventos de tracking."
							items={item.timeline}
						/>
					</div>
				</div>
			</DetailDisclosure>
		</DetailSection>
	);
}
