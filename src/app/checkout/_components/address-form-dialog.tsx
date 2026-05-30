"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

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
	FieldError,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import {
	checkoutAddressCreateInputSchema,
	type checkoutAddressUpdateInputSchema,
} from "~/schemas/checkout.schemas";
import type { CheckoutAddress } from "~/shared/common/checkout.types";

type AddressFormInput = z.input<typeof checkoutAddressCreateInputSchema>;
type AddressFormValues = z.output<typeof checkoutAddressCreateInputSchema>;
type AddressUpdateValues = z.output<typeof checkoutAddressUpdateInputSchema>;

const defaultValues: AddressFormValues = {
	type: "shipping",
	line1: "",
	line2: null,
	city: "",
	state: "",
	postalCode: "",
	country: "Argentina",
};

function addressToFormValues(address?: CheckoutAddress): AddressFormValues {
	if (!address) return defaultValues;

	return {
		type: address.type,
		line1: address.line1,
		line2: address.line2 ?? null,
		city: address.city,
		state: address.state,
		postalCode: address.postalCode,
		country: address.country,
	};
}

export function AddressFormDialog({
	address,
	isSubmitting,
	open,
	onOpenChange,
	onSubmit,
}: {
	address?: CheckoutAddress | null;
	isSubmitting?: boolean;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: AddressFormValues | AddressUpdateValues) => void;
}) {
	const form = useForm<AddressFormInput, unknown, AddressFormValues>({
		resolver: zodResolver(checkoutAddressCreateInputSchema),
		defaultValues,
	});
	const errors = form.formState.errors;

	useEffect(() => {
		if (!open) return;
		form.reset(addressToFormValues(address ?? undefined));
	}, [address, form, open]);

	const title = address ? "Editar dirección" : "Agregar dirección";

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Guardá una dirección de envío para usarla en este pedido y futuros
						checkouts.
					</DialogDescription>
				</DialogHeader>
				<form
					className="flex flex-col gap-5"
					id="checkout-address-form"
					onSubmit={form.handleSubmit((values) =>
						onSubmit(address ? { ...values, id: address.id } : values),
					)}
				>
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field data-invalid={Boolean(errors.type)}>
							<FieldLabel htmlFor="checkout-address-type">Tipo</FieldLabel>
							<Select id="checkout-address-type" {...form.register("type")}>
								<option value="shipping">Envío</option>
								<option value="all">General</option>
							</Select>
							<FieldError errors={[errors.type]} />
						</Field>
						<Field data-invalid={Boolean(errors.country)}>
							<FieldLabel htmlFor="checkout-address-country">País</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.country)}
								disabled={isSubmitting}
								id="checkout-address-country"
								{...form.register("country")}
							/>
							<FieldError errors={[errors.country]} />
						</Field>
						<Field
							className="md:col-span-2"
							data-invalid={Boolean(errors.line1)}
						>
							<FieldLabel htmlFor="checkout-address-line1">
								Dirección
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.line1)}
								disabled={isSubmitting}
								id="checkout-address-line1"
								{...form.register("line1")}
							/>
							<FieldError errors={[errors.line1]} />
						</Field>
						<Field
							className="md:col-span-2"
							data-invalid={Boolean(errors.line2)}
						>
							<FieldLabel htmlFor="checkout-address-line2">
								Complemento
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.line2)}
								disabled={isSubmitting}
								id="checkout-address-line2"
								{...form.register("line2")}
							/>
							<FieldError errors={[errors.line2]} />
						</Field>
						<Field data-invalid={Boolean(errors.city)}>
							<FieldLabel htmlFor="checkout-address-city">Ciudad</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.city)}
								disabled={isSubmitting}
								id="checkout-address-city"
								{...form.register("city")}
							/>
							<FieldError errors={[errors.city]} />
						</Field>
						<Field data-invalid={Boolean(errors.state)}>
							<FieldLabel htmlFor="checkout-address-state">
								Provincia / Estado
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.state)}
								disabled={isSubmitting}
								id="checkout-address-state"
								{...form.register("state")}
							/>
							<FieldError errors={[errors.state]} />
						</Field>
						<Field data-invalid={Boolean(errors.postalCode)}>
							<FieldLabel htmlFor="checkout-address-postal-code">
								Código postal
							</FieldLabel>
							<Input
								aria-invalid={Boolean(errors.postalCode)}
								disabled={isSubmitting}
								id="checkout-address-postal-code"
								{...form.register("postalCode")}
							/>
							<FieldError errors={[errors.postalCode]} />
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
						form="checkout-address-form"
						type="submit"
					>
						<SaveIcon data-icon="inline-start" />
						Guardar dirección
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
