"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { CrudEffectsPanel } from "~/features/admin/crud/_components/crud-effects-panel";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { resolveDisclosure } from "~/features/admin/crud/_lib/fulfillment-effects";
import {
	fromScaled,
	sumScaled,
	toScaled,
} from "~/features/admin/crud/supplier-order/supplier-order-quantity";
import type {
	PackageDetail,
	PackageFractionateInput,
	PackageFractionationCandidate,
} from "~/shared/common/admin-crud/package.types";
import { api } from "~/trpc/react";
import { InboundPackagePicker } from "./inbound-package-picker";
import { packageDisclosures } from "./package.effects";

export function PackageFractionateDialog({
	open,
	pkg,
	isSubmitting,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	pkg?: PackageDetail;
	isSubmitting?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: PackageFractionateInput) => void;
}) {
	const [extraSourceIds, setExtraSourceIds] = useState<number[]>([]);
	const [quantities, setQuantities] = useState<Record<number, string>>({});
	const [namePrefix, setNamePrefix] = useState("");

	const sourcePackageIds = useMemo(
		() => (pkg ? [pkg.id, ...extraSourceIds] : []),
		[pkg, extraSourceIds],
	);

	// The editable rows come from the server over the **whole** selection: the
	// fractionation budget is per demand allocation, so two sources covering the
	// same demand must not each offer the full remainder (§21.6). Recomputing that
	// client-side is the dual truth this procedure exists to avoid.
	const candidatesQuery = api.admin.package.fractionationCandidates.useQuery(
		{ sourcePackageIds },
		{ enabled: open && sourcePackageIds.length > 0 },
	);

	const rows: PackageFractionationCandidate[] = useMemo(
		() => candidatesQuery.data?.candidates ?? [],
		[candidatesQuery.data],
	);

	useEffect(() => {
		if (!open) {
			setExtraSourceIds([]);
			setNamePrefix("");
		}
	}, [open]);

	useEffect(() => {
		setQuantities(
			Object.fromEntries(
				rows.map((row) => [row.packagedAllocationId, row.fractionableQuantity]),
			),
		);
	}, [rows]);

	const byCart = useMemo(() => {
		const groups = new Map<string, PackageFractionationCandidate[]>();
		for (const row of rows) {
			const key = `${row.cartCode} — ${row.userName}`;
			groups.set(key, [...(groups.get(key) ?? []), row]);
		}
		return Array.from(groups.entries());
	}, [rows]);

	const excessive = rows.some((row) => {
		const declared = toScaled(quantities[row.packagedAllocationId] ?? "");
		return (
			declared === null || declared > (toScaled(row.fractionableQuantity) ?? 0n)
		);
	});
	const total = sumScaled(
		rows.map(
			(row) => toScaled(quantities[row.packagedAllocationId] ?? "") ?? 0n,
		),
	);
	// Untouched defaults mean "fraccionar todo": omitting `allocations` lets the
	// server take whatever is still fractionable at commit time, which is the
	// value the dialog was showing anyway.
	const untouched = rows.every(
		(row) =>
			(quantities[row.packagedAllocationId] ?? "") === row.fractionableQuantity,
	);

	// The disclosure counts what the operator has actually left in the boxes: a row
	// zeroed out takes its customer, its line and its quantity out of the pass.
	const taken = rows.filter(
		(row) => (toScaled(quantities[row.packagedAllocationId] ?? "") ?? 0n) > 0n,
	);
	const fractionate = {
		customerCount: new Set(taken.map((row) => row.cartId)).size,
		lineCount: new Set(taken.map((row) => `${row.cartId}:${row.lotItemId}`))
			.size,
		quantity: fromScaled(total),
		cartItemCount: new Set(taken.map((row) => row.cartItemCode)).size,
	};

	return (
		<CrudFormDialogShell
			description="Cada cliente recibe un paquete de salida propio, con lo que se le fraccione de la selección."
			footer={
				<>
					<Button
						disabled={isSubmitting}
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Volver
					</Button>
					<Button
						disabled={isSubmitting || excessive || total <= 0n}
						onClick={() =>
							onSubmit({
								sourcePackageIds,
								allocations: untouched
									? undefined
									: rows.map((row) => ({
											packagedAllocationId: row.packagedAllocationId,
											quantity: quantities[row.packagedAllocationId] ?? "0",
										})),
								namePrefix:
									namePrefix.trim().length > 0 ? namePrefix.trim() : undefined,
							})
						}
						type="button"
					>
						Fraccionar
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Fraccionar ${pkg?.name ?? "paquete"}`}
		>
			<InboundPackagePicker
				excludeId={pkg?.id}
				onToggle={(packageId) =>
					setExtraSourceIds((current) =>
						current.includes(packageId)
							? current.filter((id) => id !== packageId)
							: [...current, packageId],
					)
				}
				selectedIds={extraSourceIds}
			/>

			<Field>
				<FieldLabel htmlFor="package-fractionate-prefix">
					Prefijo de nombre
				</FieldLabel>
				<Input
					autoComplete="off"
					id="package-fractionate-prefix"
					onChange={(event) => setNamePrefix(event.target.value)}
					placeholder="Fraccionamiento"
					value={namePrefix}
				/>
				<FieldDescription>
					Opcional. Cada paquete se llama «prefijo — cliente».
				</FieldDescription>
			</Field>

			{candidatesQuery.isError ? (
				<p className="text-destructive text-xs">
					{candidatesQuery.error.message}
				</p>
			) : null}

			{rows.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					{candidatesQuery.isLoading
						? "Calculando cantidades disponibles…"
						: "No queda cantidad recibida sin fraccionar."}
				</p>
			) : (
				byCart.map(([customer, customerRows]) => (
					<section
						className="flex flex-col gap-2 rounded-2xl border p-3"
						key={customer}
					>
						<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
							{customer}
						</h3>
						{customerRows.map((row) => (
							<div
								className="flex flex-wrap items-end justify-between gap-2"
								key={row.packagedAllocationId}
							>
								<div className="flex flex-col gap-1">
									<p className="font-medium text-sm">
										{row.lotItemCode} · {row.productName}
									</p>
									<p className="text-muted-foreground text-xs">
										{row.cartItemCode} · {row.sourcePackageName} — disponible{" "}
										{row.fractionableQuantity} {row.unit}
									</p>
								</div>
								<Field className="w-40">
									<FieldLabel
										htmlFor={`package-fractionate-${row.packagedAllocationId}`}
									>
										Fraccionar
									</FieldLabel>
									<Input
										autoComplete="off"
										id={`package-fractionate-${row.packagedAllocationId}`}
										inputMode="decimal"
										onChange={(event) =>
											setQuantities((current) => ({
												...current,
												[row.packagedAllocationId]: event.target.value,
											}))
										}
										value={quantities[row.packagedAllocationId] ?? ""}
									/>
								</Field>
							</div>
						))}
					</section>
				))
			)}

			{excessive ? (
				<p className="text-destructive text-xs">
					Alguna cantidad supera lo disponible.
				</p>
			) : null}

			<CrudEffectsPanel
				disclosure={resolveDisclosure(packageDisclosures.fractionate, {
					pkg,
					fractionate,
				})}
			/>
		</CrudFormDialogShell>
	);
}
