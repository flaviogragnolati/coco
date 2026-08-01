"use client";

import { LandmarkIcon, PencilIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { ExternalPaymentDetails } from "~/features/checkout/external-payment-details";
import type { OrderExternalPayment } from "~/shared/common/checkout.types";
import { formatDateTimeShort } from "~/shared/common/date.helpers";
import { api } from "~/trpc/react";

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
			toast.success(
				"Informamos tu transferencia. Queda pendiente de verificación.",
			);
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

	const showForm = declaredReference === null || editing;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<LandmarkIcon className="size-4" />
					Esperando tu transferencia
				</CardTitle>
				<CardDescription>
					Transferí el monto a esta cuenta. Confirmamos el pedido cuando
					verifiquemos que el dinero llegó.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<ExternalPaymentDetails instructions={externalPayment} />

				{declaredReference === null ? null : (
					<div className="flex flex-col gap-2 rounded-3xl border p-3 text-xs">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-muted-foreground">
								Comprobante informado
							</span>
							<Badge variant="warning">Pendiente de verificación</Badge>
						</div>
						<span className="break-all font-medium font-mono">
							{declaredReference}
						</span>
						{externalPayment.declaredReceiptAt ? (
							<span className="text-muted-foreground">
								Informado el{" "}
								{formatDateTimeShort(externalPayment.declaredReceiptAt)}
							</span>
						) : null}
						{editing ? null : (
							<div>
								<Button
									onClick={() => setEditing(true)}
									size="sm"
									type="button"
									variant="outline"
								>
									<PencilIcon data-icon="inline-start" />
									Corregir comprobante
								</Button>
							</div>
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
						<div className="flex flex-wrap justify-end gap-2">
							{editing ? (
								<Button
									onClick={() => {
										setEditing(false);
										setReference(declaredReference ?? "");
									}}
									type="button"
									variant="outline"
								>
									Cancelar
								</Button>
							) : null}
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
						</div>
					</form>
				) : null}
			</CardContent>
		</Card>
	);
}
