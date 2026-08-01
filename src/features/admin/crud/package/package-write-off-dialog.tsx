"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { type UseFormReturn, useForm, useWatch } from "react-hook-form";
import { Button } from "~/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { CrudEffectsPanel } from "~/features/admin/crud/_components/crud-effects-panel";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import { resolveDisclosure } from "~/features/admin/crud/_lib/fulfillment-effects";
import {
	fromScaled,
	sumScaled,
	toScaled,
} from "~/features/admin/crud/supplier-order/supplier-order-quantity";
import { packageWriteOffInputSchema } from "~/schemas/admin/package.schemas";
import type {
	PackageDetail,
	PackageWriteOffFormInput,
	PackageWriteOffInput,
} from "~/shared/common/admin-crud/package.types";
import {
	type PackageWriteOffDraft,
	packageDisclosures,
} from "./package.effects";

type PackageLine = PackageDetail["packageLines"][number];

type WriteOffFormInput = PackageWriteOffFormInput;
type WriteOffFormValues = PackageWriteOffInput;
type WriteOffForm = UseFormReturn<
	WriteOffFormInput,
	unknown,
	WriteOffFormValues
>;

function liveLines(pkg?: PackageDetail) {
	return pkg?.packageLines.filter((line) => line.status !== "cancelled") ?? [];
}

function defaultValues(pkg?: PackageDetail): WriteOffFormInput {
	return {
		id: pkg?.id ?? 0,
		// Defaulting to the full live quantity makes "the whole package is lost" the
		// zero-input path; a partial write-off is the edit.
		lines: liveLines(pkg).map((line) => ({
			packageLotItemId: line.id,
			quantity: line.quantity,
		})),
		reason: "",
	};
}

function writeOffDraft(
	lines: PackageLine[],
	declared: WriteOffFormInput["lines"] | undefined,
): PackageWriteOffDraft {
	const cartItems = new Set<number>();
	let lineCount = 0;
	let total = 0n;
	let survivors = 0;

	lines.forEach((line, index) => {
		const available = toScaled(line.quantity) ?? 0n;
		const quantity = toScaled(declared?.[index]?.quantity ?? "") ?? 0n;
		if (quantity <= 0n || quantity > available) {
			survivors += 1;
			return;
		}

		total += quantity;
		// Only a line emptied by the write-off is cancelled; a partial one survives.
		if (quantity === available) lineCount += 1;
		else survivors += 1;

		for (const allocation of line.packageAllocations) {
			cartItems.add(allocation.demandAllocation.cartItem.id);
		}
	});

	return {
		lineCount,
		quantity: fromScaled(total),
		cartItemCount: cartItems.size,
		emptiesPackage: lines.length > 0 && survivors === 0,
	};
}

function LineRow({
	index,
	line,
	form,
}: {
	index: number;
	line: PackageLine;
	form: WriteOffForm;
}) {
	const quantity =
		useWatch({ control: form.control, name: `lines.${index}.quantity` }) ?? "";

	const available = toScaled(line.quantity) ?? 0n;
	const requested = toScaled(quantity);
	const excessive = requested !== null && requested > available;

	return (
		<div className="flex flex-col gap-2 rounded-lg border p-3">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div className="flex flex-col gap-1">
					<p className="font-medium text-sm">
						{line.lotItem.code} · {line.lotItem.product.name}
					</p>
					<p className="text-muted-foreground text-xs">
						En el paquete {line.quantity} {line.lotItem.product.unit}
					</p>
				</div>
				<Field className="w-40">
					<FieldLabel htmlFor={`write-off-${line.id}`}>Dar de baja</FieldLabel>
					<Input
						autoComplete="off"
						id={`write-off-${line.id}`}
						inputMode="decimal"
						{...form.register(`lines.${index}.quantity`)}
					/>
					<FieldError>
						{form.formState.errors.lines?.[index]?.quantity?.message}
					</FieldError>
					{excessive ? (
						<p className="text-destructive text-xs">
							Supera lo que hay en la línea.
						</p>
					) : null}
				</Field>
			</div>

			<div className="flex flex-col gap-1">
				{line.packageAllocations.map((allocation) => (
					<span className="text-muted-foreground text-xs" key={allocation.id}>
						{allocation.demandAllocation.cartItem.cart.code} /{" "}
						{allocation.demandAllocation.cartItem.code} — cubierto{" "}
						{allocation.quantity}
					</span>
				))}
			</div>
		</div>
	);
}

export function PackageWriteOffDialog({
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
	onSubmit: (values: WriteOffFormValues) => void;
}) {
	const form = useForm<WriteOffFormInput, unknown, WriteOffFormValues>({
		resolver: zodResolver(packageWriteOffInputSchema),
		defaultValues: defaultValues(pkg),
	});
	const lines = liveLines(pkg);

	useEffect(() => {
		if (open) form.reset(defaultValues(pkg));
	}, [open, pkg, form]);

	const watchedLines = useWatch({ control: form.control, name: "lines" });
	const reason = useWatch({ control: form.control, name: "reason" }) ?? "";

	const total = sumScaled(
		(watchedLines ?? []).map((line) => toScaled(line?.quantity ?? "") ?? 0n),
	);
	const blocked =
		total <= 0n ||
		reason.trim().length === 0 ||
		lines.some((line, index) => {
			const declared = toScaled(watchedLines?.[index]?.quantity ?? "");
			if (declared === null) return true;
			return declared > (toScaled(line.quantity) ?? 0n);
		});

	return (
		<CrudFormDialogShell
			description="Cada línea se da de baja por su cantidad; la de abajo viene precargada con todo lo que el paquete lleva."
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
						disabled={isSubmitting || blocked || lines.length === 0}
						form="package-write-off-form"
						type="submit"
						variant="destructive"
					>
						Dar de baja
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Dar de baja ${pkg?.name ?? "paquete"}`}
		>
			<form
				className="flex flex-col gap-3"
				id="package-write-off-form"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="package-write-off-reason">Motivo</FieldLabel>
						<Textarea
							id="package-write-off-reason"
							placeholder="Por qué la mercadería no va a llegar"
							rows={3}
							{...form.register("reason")}
						/>
						<FieldDescription>
							Obligatorio. Queda en la auditoría y en cada rollover generado.
						</FieldDescription>
						<FieldError>{form.formState.errors.reason?.message}</FieldError>
					</Field>
				</FieldGroup>

				{lines.length === 0 ? (
					<p className="text-muted-foreground text-xs">
						El paquete no tiene líneas activas.
					</p>
				) : (
					lines.map((line, index) => (
						<LineRow form={form} index={index} key={line.id} line={line} />
					))
				)}
			</form>

			<CrudEffectsPanel
				disclosure={resolveDisclosure(packageDisclosures.writeOff, {
					pkg,
					writeOff: writeOffDraft(lines, watchedLines),
				})}
			/>
		</CrudFormDialogShell>
	);
}
