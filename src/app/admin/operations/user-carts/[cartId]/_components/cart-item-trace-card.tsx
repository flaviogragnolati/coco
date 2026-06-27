import { Badge } from "~/components/ui/badge";
import { OperationalDiagnosticBadge } from "~/features/admin/crud/_components/operational-diagnostic-badge";
import { lotStatusLabelMap } from "~/features/admin/crud/lot/lot.mappers";
import {
	cartItemStatusLabelMap,
	fulfillmentStatusLabelMap,
} from "~/features/admin/crud/operations-cart/operations-cart.mappers";
import { packageStatusLabelMap } from "~/features/admin/crud/package/package.mappers";
import {
	shipmentStatusLabelMap,
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
		<div className="flex flex-wrap gap-1">
			<Badge variant="secondary">
				Paquete {packaging.package.name} ·{" "}
				{packageStatusLabelMap[packaging.package.status]}
				{packaging.package.trackingCode
					? ` · ${packaging.package.trackingCode}`
					: ""}
			</Badge>
			<Badge variant="outline">
				Linea #{packaging.packageLine.id} · {packaging.packageLine.quantity} ·{" "}
				{packaging.packageLine.status}
			</Badge>
			{packaging.shipment ? (
				<Badge variant="secondary">
					Envio {packaging.shipment.internalCode} ·{" "}
					{shipmentStatusLabelMap[packaging.shipment.status]} ·{" "}
					{shipmentTypeLabelMap[packaging.shipment.type]}
				</Badge>
			) : (
				<Badge variant="outline">Sin envio</Badge>
			)}
		</div>
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
		<div className="flex flex-col gap-2 rounded-none border p-2">
			<div className="flex flex-wrap gap-1">
				<Badge variant="outline">
					Demanda #{allocation.id} · {allocation.quantity}
				</Badge>
				<Badge variant="secondary">
					LotItem {lotItem.code} · {lotItem.status} · {lotItem.product.name}
				</Badge>
				<Badge variant="secondary">
					Lote {lot.code} · {lotStatusLabelMap[lot.status]} · {lot.supplierName}
				</Badge>
				<Badge variant="secondary">
					Operacion {lot.operation.code} · {lot.operation.status} ·{" "}
					{lot.operation.strategy}
				</Badge>
			</div>

			<div className="flex flex-col gap-1">
				<span className="text-muted-foreground text-xs">Empaque</span>
				{allocation.packaging.length > 0 ? (
					<div className="flex flex-col gap-1">
						{allocation.packaging.map((packaging) => (
							<PackagingRow key={packaging.id} packaging={packaging} />
						))}
					</div>
				) : (
					<span className="text-muted-foreground text-xs">
						Sin empaque todavia
					</span>
				)}
			</div>
		</div>
	);
}

function RollOverRow({ rollOver }: { rollOver: CartTraceabilityRollOver }) {
	return (
		<div className="flex flex-wrap gap-1">
			<Badge variant="outline">
				Rollover #{rollOver.id} · {rollOver.stage} · {rollOver.status} ·{" "}
				{rollOver.quantity}
			</Badge>
			<Badge variant="secondary">
				Operacion {rollOver.operation.code} · {rollOver.operation.status}
			</Badge>
			<span className="text-muted-foreground text-xs">{rollOver.reason}</span>
		</div>
	);
}

export function CartItemTraceCard({ item }: { item: CartTraceabilityItem }) {
	return (
		<article className="flex flex-col gap-3 rounded-none border p-3">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="flex flex-col gap-1">
					<span className="font-medium">{item.product.name}</span>
					<span className="font-mono text-muted-foreground text-xs">
						{item.code} · {item.quantity} {item.product.unit}
					</span>
					<div className="flex flex-wrap gap-1">
						<Badge variant="outline">
							{cartItemStatusLabelMap[item.status]}
						</Badge>
						<Badge variant="secondary">
							{fulfillmentStatusLabelMap[item.fulfillmentStatus]}
						</Badge>
						{item.deleted ? (
							<Badge variant="destructive">Eliminado</Badge>
						) : null}
					</div>
				</div>
				<OperationalDiagnosticBadge
					count={item.diagnostics.length}
					severity={item.highestDiagnosticSeverity}
				/>
			</div>

			<details className="flex flex-col gap-3 rounded-none border bg-background p-2">
				<summary className="cursor-pointer font-medium text-sm">
					Ver lineage, diagnosticos y timeline
				</summary>

				<div className="mt-3 grid gap-4">
					<div className="flex flex-col gap-2">
						<span className="font-medium text-sm">Lineage de fulfillment</span>
						{item.allocations.length > 0 ? (
							<div className="flex flex-col gap-2">
								{item.allocations.map((allocation) => (
									<AllocationCard allocation={allocation} key={allocation.id} />
								))}
							</div>
						) : (
							<p className="text-muted-foreground text-xs">
								Sin lineage todavia. El item espera agregacion en una operacion.
							</p>
						)}
					</div>

					{item.rollOvers.length > 0 ? (
						<div className="flex flex-col gap-2">
							<span className="font-medium text-sm">Rollovers</span>
							<div className="flex flex-col gap-1">
								{item.rollOvers.map((rollOver) => (
									<RollOverRow key={rollOver.id} rollOver={rollOver} />
								))}
							</div>
						</div>
					) : null}

					<div className="flex flex-col gap-2">
						<span className="font-medium text-sm">Diagnosticos</span>
						<DiagnosticList
							diagnostics={item.diagnostics}
							emptyLabel="Sin diagnosticos para este item."
						/>
					</div>

					<div className="flex flex-col gap-2">
						<span className="font-medium text-sm">Timeline del item</span>
						<TrackingTimeline
							emptyLabel="Este item todavia no tiene eventos de tracking."
							items={item.timeline}
						/>
					</div>
				</div>
			</details>
		</article>
	);
}
