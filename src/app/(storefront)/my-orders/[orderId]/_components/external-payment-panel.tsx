"use client";

import { CopyIcon, PencilIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
	ExternalPaymentDetails,
	formatTransferFields,
} from "~/features/checkout/external-payment-details";
import type { OrderExternalPayment } from "~/shared/common/checkout.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import { api } from "~/trpc/react";

/**
 * What a customer does while the order waits for their transfer: the data to
 * transfer to, and the receipt number once they did. Reporting it records a
 * claim, never a payment (ADR 0010, "Declared receipt").
 */
export function ExternalPaymentPanel({
	externalPayment,
	orderId,
}: {
	externalPayment: OrderExternalPayment;
	orderId: number;
}) {
	const router = useRouter();
	const declaredReference = externalPayment.declaredReceiptReference;
	const [reference, setReference] = useState(declaredReference ?? "");
	const [editing, setEditing] = useState(false);

	const declareReceipt = api.orders.declareExternalReceipt.useMutation({
		onSuccess() {
			setEditing(false);
			toast.success("Recibimos tu comprobante. Lo estamos verificando.");
			router.refresh();
		},
		onError(error) {
			toast.error(error.message || "No se pudo informar la transferencia");
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		declareReceipt.mutate({ orderId, reference });
	};

	const copyAll = async () => {
		try {
			await navigator.clipboard.writeText(
				formatTransferFields(externalPayment),
			);
			toast.success("Copiamos los datos para transferir");
		} catch {
			toast.error("No pudimos copiar. Copiá cada dato por separado.");
		}
	};

	const showForm = declaredReference === null || editing;

	return (
		<section
			aria-labelledby="transfer-data-title"
			className="flex flex-col gap-5 rounded-[22px] border bg-card p-5"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2
					className="font-heading font-semibold text-xl"
					id="transfer-data-title"
				>
					Datos para transferir
				</h2>
				<Button onClick={copyAll} size="sm" type="button" variant="outline">
					<CopyIcon data-icon="inline-start" />
					Copiar todo
				</Button>
			</div>

			<ExternalPaymentDetails instructions={externalPayment} />

			<div className="flex flex-col gap-3 border-t pt-5">
				<h3 className="font-heading font-semibold">¿Ya transferiste?</h3>

				{declaredReference === null ? null : (
					<div className="flex flex-col gap-1 rounded-2xl bg-brand-soft p-4 text-brand-soft-foreground text-sm">
						<span className="font-bold text-[11px] uppercase tracking-[0.12em]">
							Comprobante informado
						</span>
						<span className="break-all font-mono font-semibold">
							{declaredReference}
						</span>
						<span>
							Lo estamos verificando. Te avisamos acá cuando el pedido quede
							confirmado.
							{externalPayment.declaredReceiptAt
								? ` Lo informaste el ${formatDateTimeShort(externalPayment.declaredReceiptAt)}.`
								: null}
						</span>
						{editing ? null : (
							<Button
								className="self-start"
								onClick={() => setEditing(true)}
								size="sm"
								type="button"
								variant="outline"
							>
								<PencilIcon data-icon="inline-start" />
								Corregir comprobante
							</Button>
						)}
					</div>
				)}

				{showForm ? (
					<form className="flex flex-col gap-3" onSubmit={handleSubmit}>
						<Field>
							<FieldLabel htmlFor="declared-receipt-reference">
								Número de comprobante
							</FieldLabel>
							<Input
								id="declared-receipt-reference"
								maxLength={120}
								onChange={(event) => setReference(event.target.value)}
								placeholder="Ej. 0012345678"
								value={reference}
							/>
							<FieldDescription>
								Es el número que te dio tu banco. Lo usamos para encontrar tu
								transferencia.
							</FieldDescription>
						</Field>
						<div className="flex flex-wrap gap-2">
							<Button
								disabled={
									declareReceipt.isPending || reference.trim().length < 3
								}
								type="submit"
							>
								<SendIcon data-icon="inline-start" />
								{declareReceipt.isPending
									? "Informando..."
									: "Informar transferencia"}
							</Button>
							{editing ? (
								<Button
									onClick={() => {
										setEditing(false);
										setReference(declaredReference ?? "");
									}}
									type="button"
									variant="ghost"
								>
									Cancelar
								</Button>
							) : null}
						</div>
					</form>
				) : null}
			</div>
		</section>
	);
}
