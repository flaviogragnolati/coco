"use client";

import { CopyIdentifierButton } from "~/components/copy-identifier-button";
import { cn } from "~/lib/utils";
import type { ExternalPaymentInstructions } from "~/shared/common/admin-crud/payment.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { formatDateTimeShort } from "~/shared/common/date.helpers";

type TransferField = {
	label: string;
	display: string;
	copyValue: string;
	mono?: boolean;
};

function buildTransferFields(
	instructions: ExternalPaymentInstructions,
): TransferField[] {
	const accountFields: {
		label: string;
		value: string | null;
		mono?: boolean;
	}[] = [
		{ label: "Titular", value: instructions.accountHolder },
		{ label: "Banco", value: instructions.bankName },
		{ label: "CBU", value: instructions.cbu, mono: true },
		{ label: "Alias", value: instructions.alias, mono: true },
		{ label: "CUIT", value: instructions.taxId, mono: true },
	];

	return [
		...accountFields.flatMap<TransferField>((field) =>
			field.value
				? [
						{
							label: field.label,
							display: field.value,
							copyValue: field.value,
							mono: field.mono,
						},
					]
				: [],
		),
		{
			label: "Monto",
			display: formatCurrency(instructions.amount, instructions.currency),
			copyValue: instructions.amount,
		},
		{
			label: "Referencia",
			display: instructions.orderCode,
			copyValue: instructions.orderCode,
			mono: true,
		},
	];
}

/**
 * The transfer data a user needs while an external attempt is pending, shared by
 * the checkout result panel and the order detail (ADR 0010).
 */
export function ExternalPaymentDetails({
	className,
	instructions,
}: {
	className?: string;
	instructions: ExternalPaymentInstructions;
}) {
	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<div className="grid gap-3 sm:grid-cols-2">
				{buildTransferFields(instructions).map((field) => (
					<div
						className="flex items-start justify-between gap-2 rounded-3xl bg-muted/40 p-3 text-xs"
						key={field.label}
					>
						<div className="flex min-w-0 flex-col gap-1">
							<span className="text-muted-foreground">{field.label}</span>
							<span
								className={cn(
									"break-all font-medium",
									field.mono && "font-mono",
								)}
							>
								{field.display}
							</span>
						</div>
						<CopyIdentifierButton label={field.label} value={field.copyValue} />
					</div>
				))}
			</div>
			<p className="text-muted-foreground text-xs/relaxed">
				Usá el código de referencia al hacer la transferencia para que podamos
				identificarla.
				{instructions.expiresAt
					? ` Tenés tiempo hasta el ${formatDateTimeShort(instructions.expiresAt)}.`
					: null}
			</p>
			{instructions.instructions ? (
				<p className="text-muted-foreground text-xs/relaxed">
					{instructions.instructions}
				</p>
			) : null}
		</div>
	);
}
