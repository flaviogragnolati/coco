"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CrudAvailableAction } from "~/features/admin/crud/_components/crud-available-action";
import { IdTooltip } from "~/features/admin/crud/_components/crud-cell-tooltips";
import {
	DetailDatesField,
	DetailDiagnosticList,
	DetailEmpty,
	DetailEventList,
	DetailField,
	DetailGrid,
	DetailItem,
	DetailMetrics,
	DetailSection,
} from "~/features/admin/crud/_components/crud-detail";
import { CrudDetailDialogShell } from "~/features/admin/crud/_components/crud-detail-dialog-shell";
import { StatusChip } from "~/features/admin/crud/_components/crud-status-chip";
import type { LotDetail } from "~/shared/common/admin-crud/lot.types";
import { supplierOrderActionLabelMap } from "../supplier-order/supplier-order.mappers";
import { lotItemStatusConfig, lotStatusConfig } from "./lot.mappers";

/**
 * Information, not a footer of clickable-looking buttons: a lot is never
 * commanded directly, it follows its supplier order (ADR 0003). Every entry
 * comes back disabled from the server, each naming the order to use instead.
 */
function AccionesDeLaOrden({ lot }: { lot: LotDetail }) {
	return (
		<DetailSection
			description={`El lote sigue a su orden de proveedor${
				lot.supplierOrder ? ` ${lot.supplierOrder.code}` : ""
			}; no se comanda por separado.`}
			title="Acciones de la orden de proveedor"
		>
			<div className="flex flex-wrap gap-2">
				{lot.availableActions.map((entry) => (
					<CrudAvailableAction
						enabled={entry.enabled}
						key={entry.action}
						label={supplierOrderActionLabelMap[entry.action]}
						onClick={() => undefined}
						reason={entry.reason}
					/>
				))}
			</div>
		</DetailSection>
	);
}

function Resumen({ lot }: { lot: LotDetail }) {
	return (
		<div className="flex flex-col gap-3">
			<DetailMetrics
				items={[
					{ label: "Líneas", value: lot.lotItemQuantity },
					{ label: "Demanda", value: lot.demandAllocationQuantity },
					{ label: "Empaquetado", value: lot.packagedQuantity },
					{
						label: "Pendiente",
						value: lot.pendingQuantity,
						tone: Number(lot.pendingQuantity) > 0 ? "warning" : "default",
					},
				]}
			/>

			<DetailSection title="Datos del lote">
				<DetailGrid columns={3}>
					<DetailField
						hint={<IdTooltip id={lot.operation.id} label="Operación" />}
						label="Operación"
					>
						{lot.operation.code}
					</DetailField>
					<DetailField
						hint={lot.supplierOrder?.code ?? "Sin orden de proveedor"}
						label="Proveedor"
					>
						{lot.supplier.name}
					</DetailField>
					<DetailDatesField
						createdAt={lot.createdAt}
						updatedAt={lot.updatedAt}
					/>
				</DetailGrid>
			</DetailSection>

			<AccionesDeLaOrden lot={lot} />
		</div>
	);
}

function Lineas({ lot }: { lot: LotDetail }) {
	if (lot.lotItems.length === 0) {
		return <DetailEmpty>Sin líneas de lote</DetailEmpty>;
	}

	return (
		<section className="flex flex-col gap-2">
			{lot.lotItems.map((item) => (
				<DetailItem key={item.id}>
					<div className="flex flex-wrap items-start justify-between gap-2">
						<div className="flex flex-col gap-1.5">
							<p className="font-medium">
								<span className="font-mono text-muted-foreground text-xs">
									{item.code}
								</span>{" "}
								{item.product.name}
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<StatusChip config={lotItemStatusConfig[item.status]} />
								<span className="text-muted-foreground text-xs">
									Destino {item.destination.name}
								</span>
							</div>
						</div>
						<p className="font-semibold text-sm tabular-nums">
							{item.quantity}{" "}
							<span className="font-normal text-muted-foreground">
								{item.product.unit}
							</span>
						</p>
					</div>
					{item.demandAllocations.length > 0 ? (
						<ul className="mt-3 flex flex-col divide-y border-t text-xs">
							{item.demandAllocations.map((allocation) => (
								<li
									className="grid items-center gap-x-3 gap-y-1 py-2 last:pb-0 md:grid-cols-[1fr_5rem_14rem]"
									key={allocation.id}
								>
									<Link
										className="font-medium font-mono underline-offset-4 hover:underline"
										href={`/admin/tracking?cartItemId=${allocation.cartItem.id}`}
									>
										{allocation.cartItem.cart.code} / {allocation.cartItem.code}
									</Link>
									<span className="tabular-nums md:text-right">
										{allocation.quantity}
									</span>
									<span className="truncate text-muted-foreground">
										{allocation.cartItem.cart.user.email}
									</span>
								</li>
							))}
						</ul>
					) : null}
				</DetailItem>
			))}
		</section>
	);
}

function Actividad({ lot }: { lot: LotDetail }) {
	return (
		<div className="grid gap-3 md:grid-cols-2">
			<DetailSection title="Últimos eventos">
				<DetailEventList events={lot.trackingEvents} />
			</DetailSection>
			<DetailSection title="Diagnósticos">
				<DetailDiagnosticList diagnostics={lot.diagnostics} />
			</DetailSection>
		</div>
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
		<CrudDetailDialogShell
			description="Líneas del lote, demanda asignada, empaque y diagnósticos. Solo lectura."
			errorMessage={errorMessage}
			eyebrow="Lote"
			footer={
				lot ? (
					<Button asChild variant="outline">
						<Link href={`/admin/tracking?lotId=${lot.id}`}>Ver tracking</Link>
					</Button>
				) : null
			}
			isLoading={isLoading}
			onOpenChange={onOpenChange}
			open={open}
			status={lot ? <StatusChip config={lotStatusConfig[lot.status]} /> : null}
			title={lot ? lot.code : "Detalle de lote"}
		>
			{lot ? (
				<Tabs className="w-full" defaultValue="resumen">
					<TabsList className="flex-wrap" variant="line">
						<TabsTrigger value="resumen">Resumen</TabsTrigger>
						<TabsTrigger value="lineas">
							Líneas ({lot.lotItems.length})
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
		</CrudDetailDialogShell>
	);
}
