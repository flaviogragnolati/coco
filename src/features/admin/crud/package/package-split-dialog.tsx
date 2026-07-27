"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import {
	sumScaled,
	toScaled,
} from "~/features/admin/crud/supplier-order/supplier-order-quantity";
import type {
	PackageDetail,
	PackageSplitInput,
} from "~/shared/common/admin-crud/package.types";

type Target = { key: number; name: string; lines: Record<number, string> };

function emptyTarget(key: number): Target {
	return { key, name: "", lines: {} };
}

/**
 * Splitting is quantity-level: a line can travel in several targets as long as
 * the totals do not exceed what it holds. Nothing is lost — what leaves the
 * source is created on the destination.
 */
export function PackageSplitDialog({
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
	onSubmit: (values: PackageSplitInput) => void;
}) {
	const [targets, setTargets] = useState<Target[]>([emptyTarget(0)]);
	const [nextKey, setNextKey] = useState(1);

	useEffect(() => {
		if (!open) return;
		setTargets([emptyTarget(0)]);
		setNextKey(1);
	}, [open]);

	const lines =
		pkg?.packageLines.filter((line) => line.status !== "cancelled") ?? [];

	const movedFor = (lineId: number) =>
		sumScaled(
			targets.map((target) => toScaled(target.lines[lineId] ?? "") ?? 0n),
		);

	const overCommitted = lines.some(
		(line) => movedFor(line.id) > (toScaled(line.quantity) ?? 0n),
	);
	const totalMoved = sumScaled(lines.map((line) => movedFor(line.id)));
	const missingName = targets.some((target) => target.name.trim().length === 0);
	const emptyTargetPresent = targets.some((target) =>
		Object.values(target.lines).every((value) => (toScaled(value) ?? 0n) <= 0n),
	);

	const setLine = (targetKey: number, lineId: number, value: string) => {
		setTargets((current) =>
			current.map((target) =>
				target.key === targetKey
					? { ...target, lines: { ...target.lines, [lineId]: value } }
					: target,
			),
		);
	};

	return (
		<CrudFormDialogShell
			description="El paquete se reparte en los bultos físicos reales. No se pierde cantidad: lo que sale del origen se crea en el destino, sobre el mismo envío."
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
						disabled={
							isSubmitting ||
							overCommitted ||
							missingName ||
							emptyTargetPresent ||
							totalMoved <= 0n
						}
						onClick={() =>
							onSubmit({
								id: pkg?.id ?? 0,
								targets: targets.map((target) => ({
									name: target.name.trim(),
									lines: Object.entries(target.lines)
										.filter(([, value]) => (toScaled(value) ?? 0n) > 0n)
										.map(([lineId, value]) => ({
											packageLotItemId: Number(lineId),
											quantity: value,
										})),
								})),
							})
						}
						type="button"
					>
						Dividir
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Dividir ${pkg?.name ?? "paquete"}`}
		>
			{lines.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					El paquete no tiene líneas activas.
				</p>
			) : (
				<>
					<section className="flex flex-col gap-1 rounded-2xl border p-3">
						<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
							Origen
						</h3>
						{lines.map((line) => (
							<p className="text-xs" key={line.id}>
								{line.lotItem.code} · {line.lotItem.product.name} —{" "}
								{line.quantity} {line.lotItem.product.unit}
							</p>
						))}
					</section>

					{targets.map((target, index) => (
						<section
							className="flex flex-col gap-2 rounded-2xl border p-3"
							key={target.key}
						>
							<div className="flex items-end justify-between gap-2">
								<Field className="flex-1">
									<FieldLabel htmlFor={`package-split-name-${target.key}`}>
										Paquete destino {index + 1}
									</FieldLabel>
									<Input
										autoComplete="off"
										id={`package-split-name-${target.key}`}
										onChange={(event) =>
											setTargets((current) =>
												current.map((entry) =>
													entry.key === target.key
														? { ...entry, name: event.target.value }
														: entry,
												),
											)
										}
										placeholder="Nombre del bulto"
										value={target.name}
									/>
								</Field>
								{targets.length > 1 ? (
									<Button
										onClick={() =>
											setTargets((current) =>
												current.filter((entry) => entry.key !== target.key),
											)
										}
										size="icon"
										type="button"
										variant="outline"
									>
										<Trash2Icon className="size-4" />
									</Button>
								) : null}
							</div>

							{lines.map((line) => (
								<Field className="w-full" key={line.id}>
									<FieldLabel
										htmlFor={`package-split-${target.key}-${line.id}`}
									>
										{line.lotItem.code} · {line.lotItem.product.name}
									</FieldLabel>
									<Input
										autoComplete="off"
										id={`package-split-${target.key}-${line.id}`}
										inputMode="decimal"
										onChange={(event) =>
											setLine(target.key, line.id, event.target.value)
										}
										placeholder="0"
										value={target.lines[line.id] ?? ""}
									/>
								</Field>
							))}
						</section>
					))}

					<Button
						onClick={() => {
							setTargets((current) => [...current, emptyTarget(nextKey)]);
							setNextKey((key) => key + 1);
						}}
						type="button"
						variant="outline"
					>
						<PlusIcon className="size-4" /> Agregar paquete destino
					</Button>

					<FieldDescription>
						Lo que quede en cada línea se conserva en el paquete de origen. Una
						línea que se vacía queda cancelada, con su cantidad como historia.
					</FieldDescription>

					{overCommitted ? (
						<p className="text-destructive text-xs">
							Alguna línea reparte más de lo que tiene.
						</p>
					) : null}
					{missingName ? (
						<p className="text-destructive text-xs">
							Cada paquete destino necesita un nombre.
						</p>
					) : null}
					{emptyTargetPresent ? (
						<p className="text-destructive text-xs">
							Cada paquete destino necesita al menos una línea con cantidad.
						</p>
					) : null}
				</>
			)}
		</CrudFormDialogShell>
	);
}
