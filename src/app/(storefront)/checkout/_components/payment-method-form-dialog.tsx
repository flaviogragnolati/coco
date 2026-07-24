"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import {
	checkoutPaymentMethodCreateInputSchema,
	type checkoutPaymentMethodUpdateInputSchema,
} from "~/schemas/checkout.schemas";
import type { CheckoutPaymentMethod } from "~/shared/common/checkout.types";

type PaymentMethodFormInput = z.input<
	typeof checkoutPaymentMethodCreateInputSchema
>;
type PaymentMethodFormValues = z.output<
	typeof checkoutPaymentMethodCreateInputSchema
>;
type PaymentMethodUpdateValues = z.output<
	typeof checkoutPaymentMethodUpdateInputSchema
>;

const defaultValues: PaymentMethodFormValues = {
	type: "credit_card",
	label: "",
	details: "",
};

function paymentMethodToFormValues(
	paymentMethod?: CheckoutPaymentMethod,
): PaymentMethodFormValues {
	if (!paymentMethod) return defaultValues;

	return {
		type: paymentMethod.type,
		label: paymentMethod.label,
		details: paymentMethod.details,
	};
}

export function PaymentMethodFormDialog({
	isSubmitting,
	open,
	paymentMethod,
	onOpenChange,
	onSubmit,
}: {
	isSubmitting?: boolean;
	open: boolean;
	paymentMethod?: CheckoutPaymentMethod | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: (
		values: PaymentMethodFormValues | PaymentMethodUpdateValues,
	) => void;
}) {
	const form = useForm<
		PaymentMethodFormInput,
		unknown,
		PaymentMethodFormValues
	>({
		resolver: zodResolver(checkoutPaymentMethodCreateInputSchema),
		defaultValues,
	});
	const errors = form.formState.errors;

	useEffect(() => {
		if (!open) return;
		form.reset(paymentMethodToFormValues(paymentMethod ?? undefined));
	}, [form, open, paymentMethod]);

	const title = paymentMethod
		? "Editar método de pago"
		: "Agregar método de pago";

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Este checkout usa un proveedor mock. Guardá solo referencias
						seguras, como marca, alias o últimos dígitos.
					</DialogDescription>
				</DialogHeader>
				<Alert>
					<AlertTitle>Datos seguros</AlertTitle>
					<AlertDescription>
						No ingreses número completo de tarjeta, CVV, PIN ni credenciales.
					</AlertDescription>
				</Alert>
				<form
					className="flex flex-col gap-5"
					id="checkout-payment-method-form"
					onSubmit={form.handleSubmit((values) =>
						onSubmit(
							paymentMethod ? { ...values, id: paymentMethod.id } : values,
						),
					)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field data-invalid={Boolean(errors.type)}>
							<FieldLabel htmlFor="checkout-payment-type">Tipo</FieldLabel>
							<Select id="checkout-payment-type" {...form.register("type")}>
								<option value="credit_card">Tarjeta tokenizada</option>
								<option value="mercadopago">Mercado Pago</option>
								<option value="bank_transfer">Transferencia</option>
								<option value="google_pay">Google Pay</option>
								<option value="cash">Efectivo</option>
								<option value="other">Otro</option>
							</Select>
							<FieldError errors={[errors.type]} />
						</Field>
						<Field data-invalid={Boolean(errors.label)}>
							<FieldLabel htmlFor="checkout-payment-label">Nombre</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.label)}
								disabled={isSubmitting}
								id="checkout-payment-label"
								placeholder="Visa empresa"
								{...form.register("label")}
							/>
							<FieldError errors={[errors.label]} />
						</Field>
						<Field
							className="md:col-span-2"
							data-invalid={Boolean(errors.details)}
						>
							<FieldLabel htmlFor="checkout-payment-details">
								Referencia visible
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.details)}
								disabled={isSubmitting}
								id="checkout-payment-details"
								placeholder="Terminada en 1234"
								{...form.register("details")}
							/>
							<FieldDescription>
								Para probar un rechazo del mock, incluí “fail” o “rechazo”.
							</FieldDescription>
							<FieldError errors={[errors.details]} />
						</Field>
					</FieldGroup>
				</form>
				<DialogFooter>
					<Button
						disabled={isSubmitting}
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cancelar
					</Button>
					<Button
						disabled={isSubmitting}
						form="checkout-payment-method-form"
						type="submit"
					>
						<SaveIcon data-icon="inline-start" />
						Guardar método
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
