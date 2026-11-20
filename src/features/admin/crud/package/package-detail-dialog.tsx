"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { CrudAvailableAction } from "~/features/admin/crud/_components/crud-available-action";
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
import type {
	PackageCommandKey,
	PackageDetail,
} from "~/shared/common/admin-crud/package.types";
import {
	packageActionLabelMap,
	packageLegConfig,
	packageLotItemStatusConfig,
	packageStatusConfig,
} from "./package.mappers";

/** Only the commands that take quantity away read as destructive. */
const destructiveActions: ReadonlySet<PackageCommandKey> = new Set([
	"markDelayed",
	"markFailed",
	"writeOff",
]);

function Resumen({ pkg }: { pkg: PackageDetail }) {
	return (
		<div className="flex flex-col gap-3">
			<DetailMetrics
				columns={5}
				items={[
					{ label: "Líneas", value: pkg.packageLineQuantity },
					{ label: "Asignado", value: pkg.packagedAllocationQuantity },
					{
						label: "Sin asignar",
						value: pkg.unallocatedQuantity,
						tone: Number(pkg.unallocatedQuantity) > 0 ? "warning" : "default",
					},
					{ label: "Sin fraccionar", value: pkg.fractionableQuantity },
					{ label: "Clientes", value: pkg.distinctCartCount },
				]}
			/>

			<DetailSection title="Datos del paquete">
				<DetailGrid columns={3}>
					<DetailField label="Código de seguimiento">
						{pkg.trackingCode ? (
							<span className="font-mono">{pkg.trackingCode}</span>
						) : (
							<span className="font-normal text-muted-foreground">
								Sin código
							</span>
						)}
					</DetailField>
					<DetailField hint={pkg.shipment?.name} label="Envío">
						{pkg.shipment?.internalCode ?? (
							<span className="font-normal text-muted-foreground">
								Sin envío
							</span>
						)}
					</DetailField>
					<DetailDatesField
						createdAt={pkg.createdAt}
						updatedAt={pkg.updatedAt}
					/>
				</DetailGrid>
			</DetailSection>
		</div>
	);
}

function Lineas({ pkg }: { pkg: PackageDetail }) {
	if (pkg.packageLines.length === 0) {
		return <DetailEmpty>Sin líneas de paquete</DetailEmpty>;
	}

	return (
		<section className="flex flex-col gap-2">
			{pkg.packageLines.map((line) => (
				<DetailItem key={line.id}>
					<div className="flex flex-wrap items-start justify-between gap-2">
						<div className="flex flex-col gap-1.5">
							<p className="font-medium">
								<span className="font-mono text-muted-foreground text-xs">
									{line.lotItem.code}
								</span>{" "}
								{line.lotItem.product.name}
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<StatusChip config={packageLotItemStatusConfig[line.status]} />
								<span className="text-muted-foreground text-xs">
									Lote {line.lotItem.lot.code}
								</span>
							</div>
						</div>
						<p className="font-semibold text-sm tabular-nums">
							{line.quantity}{" "}
							<span className="font-normal text-muted-foreground">
								{line.lotItem.product.unit}
							</span>
						</p>
					</div>
					{line.packageAllocations.length > 0 ? (
						<ul className="mt-3 flex flex-col divide-y border-t text-xs">
							{line.packageAllocations.map((allocation) => (
								<li
									className="grid items-center gap-x-3 gap-y-1 py-2 last:pb-0 md:grid-cols-[1fr_5rem_14rem]"
									key={allocation.id}
								>
									<Link
										className="font-medium font-mono underline-offset-4 hover:underline"
										href={`/admin/tracking?cartItemId=${allocation.demandAllocation.cartItem.id}`}
									>
										{allocation.demandAllocation.cartItem.cart.code} /{" "}
										{allocation.demandAllocation.cartItem.code}
									</Link>
									<span className="tabular-nums md:text-right">
										{allocation.quantity}
									</span>
									<span className="truncate text-muted-foreground">
										{allocation.demandAllocation.cartItem.cart.user.email}
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

function Actividad({ pkg }: { pkg: PackageDetail }) {
	return (
		<div className="grid gap-3 md:grid-cols-2">
			<DetailSection title="Últimos eventos">
				<DetailEventList events={pkg.trackingEvents} />
			</DetailSection>
			<DetailSection title="Diagnósticos">
				<DetailDiagnosticList diagnostics={pkg.diagnostics} />
			</DetailSection>
		</div>
	);
}

export function PackageDetailDialog({
	open,
	pkg,
	isLoading,
	errorMessage,
	onOpenChange,
	onAction,
}: {
	open: boolean;
	pkg?: PackageDetail;
	isLoading: boolean;
	errorMessage?: string;
	onOpenChange: (open: boolean) => void;
	onAction: (action: PackageCommandKey) => void;
}) {
	return (
		<CrudDetailDialogShell
			description="Líneas, asignaciones, envío y diagnósticos del paquete."
			errorMessage={errorMessage}
			eyebrow="Paquete"
			footer={
				pkg ? (
					<>
						<Button asChild variant="outline">
							<Link href={`/admin/tracking?packageId=${pkg.id}`}>
								Ver tracking
							</Link>
						</Button>
						{pkg.availableActions.map((entry) => (
							<CrudAvailableAction
								destructive={destructiveActions.has(entry.action)}
								enabled={entry.enabled}
								key={entry.action}
								label={packageActionLabelMap[entry.action]}
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
				pkg ? (
					<>
						<StatusChip config={packageStatusConfig[pkg.status]} />
						<StatusChip config={packageLegConfig[pkg.leg]} />
					</>
				) : null
			}
			title={pkg ? pkg.name : "Detalle de paquete"}
		>
			{pkg ? (
				<Tabs className="w-full" defaultValue="resumen">
					<TabsList className="flex-wrap" variant="line">
						<TabsTrigger value="resumen">Resumen</TabsTrigger>
						<TabsTrigger value="lineas">
							Líneas ({pkg.packageLines.length})
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
		</CrudDetailDialogShell>
	);
}
