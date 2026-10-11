"use client";

import { ArrowRightIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { CrudTable } from "~/features/admin/crud/_components/crud-table";
import type { CrudColumn } from "~/shared/common/admin-crud/crud.types";
import type {
	PriceSheetPreview,
	PriceSheetPreviewRow,
} from "~/shared/common/admin-crud/price-sheet.types";

const priceFormatter = new Intl.NumberFormat("es-AR", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("es-AR", {
	maximumFractionDigits: 1,
	signDisplay: "exceptZero",
});

function formatPrice(value: string | null, currency: string | null) {
	if (value === null) return "—";
	const prefix = !currency || currency === "ARS" ? "$" : currency;
	return `${prefix} ${priceFormatter.format(Number(value))}`;
}

function Change({ from, to }: { from: string; to: string }) {
	return (
		<span className="inline-flex flex-wrap items-center gap-1">
			<span className="text-muted-foreground">{from}</span>
			<ArrowRightIcon aria-label="pasa a" className="size-3.5" />
			<span className="font-medium text-foreground">{to}</span>
		</span>
	);
}

const previewColumns: CrudColumn<PriceSheetPreviewRow>[] = [
	{
		key: "row",
		header: "Fila",
		className: "w-14 font-mono",
		cell: (row) => row.rowNumber,
	},
	{
		key: "product",
		header: "Producto",
		cell: (row) => (
			<div className="flex min-w-40 flex-col">
				<span className="font-medium text-foreground">
					{row.productName ?? (row.productId ? `#${row.productId}` : "—")}
				</span>
				{row.unitLabel ? (
					<span className="text-muted-foreground text-xs">
						#{row.productId} · {row.unitLabel}
					</span>
				) : null}
			</div>
		),
	},
	{
		key: "price",
		header: "Precio por unidad",
		cell: (row) =>
			row.price ? (
				<Change
					from={formatPrice(row.price.current, row.currency)}
					to={formatPrice(row.price.next, row.currency)}
				/>
			) : (
				<span className="text-muted-foreground">Sin cambio</span>
			),
	},
	{
		key: "variation",
		header: "Variación",
		className: "w-28",
		cell: (row) =>
			row.price?.variationPercent === null ||
			row.price?.variationPercent === undefined ? (
				"—"
			) : (
				<span className="inline-flex flex-col items-start gap-1">
					<span className="font-mono">
						{percentFormatter.format(row.price.variationPercent)} %
					</span>
					{row.largeVariation ? (
						<Badge variant="warning">
							<TriangleAlertIcon data-icon="inline-start" />
							Más de ±30 %
						</Badge>
					) : null}
				</span>
			),
	},
	{
		key: "category",
		header: "Categoría",
		cell: (row) =>
			row.category ? (
				<Change
					from={row.category.current?.name ?? "Sin categoría"}
					to={row.category.next.name}
				/>
			) : (
				<span className="text-muted-foreground">Sin cambio</span>
			),
	},
	{
		key: "errors",
		header: "Errores",
		cell: (row) =>
			row.errors.length === 0 ? (
				<Badge variant="success">OK</Badge>
			) : (
				<ul className="flex min-w-48 flex-col gap-1 text-destructive text-xs">
					{row.errors.map((error) => (
						<li key={error}>{error}</li>
					))}
				</ul>
			),
	},
];

function plural(count: number, one: string, other: string) {
	return `${count} ${count === 1 ? one : other}`;
}

export function PriceSheetPreviewDialog({
	open,
	onOpenChange,
	fileName,
	preview,
	isLoading,
	isApplying,
	error,
	onChooseFile,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fileName: string | null;
	preview: PriceSheetPreview | null;
	isLoading: boolean;
	isApplying: boolean;
	error: string | null;
	onChooseFile: () => void;
	onConfirm: () => void;
}) {
	const busy = isLoading || isApplying;

	return (
		<CrudFormDialogShell
			contentClassName="sm:max-w-6xl"
			description={
				fileName
					? `Archivo: ${fileName}. Revisá los cambios antes de confirmar; nada se guarda hasta entonces.`
					: undefined
			}
			footer={
				<>
					<Button
						disabled={busy}
						onClick={onChooseFile}
						type="button"
						variant="outline"
					>
						Elegir otro archivo
					</Button>
					<Button
						disabled={busy || !preview?.canApply}
						onClick={onConfirm}
						type="button"
						variant="highlight"
					>
						{isApplying ? (
							<Loader2Icon className="animate-spin" data-icon="inline-start" />
						) : null}
						Confirmar{" "}
						{preview
							? plural(preview.changes.length, "cambio", "cambios")
							: "cambios"}
					</Button>
				</>
			}
			onOpenChange={(next) => {
				if (!busy) onOpenChange(next);
			}}
			open={open}
			title="Vista previa de la planilla"
		>
			<div className="flex flex-col gap-3">
				{isLoading ? (
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<Loader2Icon className="size-4 animate-spin" />
						Leyendo la planilla…
					</p>
				) : null}

				{error ? (
					<Alert variant="destructive">
						<TriangleAlertIcon />
						<AlertTitle>No se pudo usar la planilla</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				) : null}

				{preview && !isLoading ? (
					<>
						<div className="flex flex-wrap gap-2">
							<Badge variant="info">
								{plural(
									preview.changes.length,
									"producto cambia",
									"productos cambian",
								)}
							</Badge>
							<Badge variant="secondary">
								{plural(
									preview.unchangedCount,
									"fila sin cambios",
									"filas sin cambios",
								)}{" "}
								(se ignoran)
							</Badge>
							{preview.largeVariationCount > 0 ? (
								<Badge variant="warning">
									{plural(
										preview.largeVariationCount,
										"variación de más de ±30 %",
										"variaciones de más de ±30 %",
									)}
								</Badge>
							) : null}
							{preview.errorCount > 0 ? (
								<Badge variant="destructive">
									{plural(
										preview.errorCount,
										"fila con errores",
										"filas con errores",
									)}
								</Badge>
							) : null}
						</div>

						{preview.errorCount > 0 ? (
							<Alert variant="destructive">
								<TriangleAlertIcon />
								<AlertTitle>La planilla tiene errores</AlertTitle>
								<AlertDescription>
									Se aplica todo o nada: corregí las filas marcadas y volvé a
									subir el archivo.
								</AlertDescription>
							</Alert>
						) : preview.changes.length === 0 ? (
							<Alert>
								<AlertTitle>No hay cambios</AlertTitle>
								<AlertDescription>
									Completá la columna "precio nuevo" o cambiá la "categoría" de
									los productos que quieras actualizar.
								</AlertDescription>
							</Alert>
						) : null}

						{preview.rows.length > 0 ? (
							<CrudTable
								columns={previewColumns}
								getRowClassName={(row) =>
									row.errors.length > 0 ? "bg-destructive/5" : undefined
								}
								getRowKey={(row) => row.rowNumber}
								items={preview.rows}
							/>
						) : null}
					</>
				) : null}
			</div>
		</CrudFormDialogShell>
	);
}
