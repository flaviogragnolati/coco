"use client";

import { SaveIcon } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "~/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { checkoutAddressCreateInputSchema } from "~/schemas/checkout.schemas";
import type {
	CheckoutAddress,
	CheckoutAddressCreateInput,
	CheckoutAddressUpdateInput,
} from "~/shared/common/checkout.types";
import { DELIVERY_AREA } from "~/shared/common/delivery-area";

type Errors = Partial<Record<"line1" | "line2" | "postalCode", string>>;

/**
 * Street, floor and postal code: the city, the province and the country come
 * from `DELIVERY_AREA` for a new address and are kept as they were for one
 * being edited. Submits through the same schema the server validates with.
 */
export function AddressForm({
	address,
	saving,
	onSubmit,
	onCancel,
}: {
	/** The address being edited; absent for a new one. */
	address?: CheckoutAddress | null;
	saving: boolean;
	onSubmit: (
		input: CheckoutAddressCreateInput | CheckoutAddressUpdateInput,
	) => void;
	/** Absent when there is nothing to go back to (a first address). */
	onCancel?: () => void;
}) {
	const [line1, setLine1] = useState(address?.line1 ?? "");
	const [line2, setLine2] = useState(address?.line2 ?? "");
	const [postalCode, setPostalCode] = useState(
		address?.postalCode ?? DELIVERY_AREA.postalCode,
	);
	const [errors, setErrors] = useState<Errors>({});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = checkoutAddressCreateInputSchema.safeParse({
			type: address?.type ?? "shipping",
			line1,
			line2,
			postalCode,
			city: address?.city ?? DELIVERY_AREA.city,
			state: address?.state ?? DELIVERY_AREA.state,
			country: address?.country ?? DELIVERY_AREA.country,
		});
		if (!parsed.success) {
			const next: Errors = {};
			for (const issue of parsed.error.issues) {
				const field = issue.path[0];
				if (field === "line1" || field === "line2" || field === "postalCode") {
					next[field] ??= issue.message;
				}
			}
			setErrors(next);
			return;
		}
		setErrors({});
		onSubmit(address ? { ...parsed.data, id: address.id } : parsed.data);
	};

	return (
		<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
			<Field data-invalid={Boolean(errors.line1)}>
				<FieldLabel htmlFor="finish-address-line1">Calle y número</FieldLabel>
				<Input
					aria-invalid={Boolean(errors.line1)}
					autoComplete="address-line1"
					disabled={saving}
					id="finish-address-line1"
					onChange={(event) => setLine1(event.target.value)}
					placeholder="Ej. Gobernador Paz 1240"
					value={line1}
				/>
				<FieldError
					errors={[errors.line1 ? { message: errors.line1 } : undefined]}
				/>
			</Field>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field data-invalid={Boolean(errors.line2)}>
					<FieldLabel htmlFor="finish-address-line2">Piso o depto</FieldLabel>
					<Input
						autoComplete="address-line2"
						disabled={saving}
						id="finish-address-line2"
						onChange={(event) => setLine2(event.target.value)}
						placeholder="Opcional"
						value={line2}
					/>
				</Field>
				<Field data-invalid={Boolean(errors.postalCode)}>
					<FieldLabel htmlFor="finish-address-postal-code">
						Código postal
					</FieldLabel>
					<Input
						aria-invalid={Boolean(errors.postalCode)}
						autoComplete="postal-code"
						disabled={saving}
						id="finish-address-postal-code"
						inputMode="numeric"
						onChange={(event) => setPostalCode(event.target.value)}
						value={postalCode}
					/>
					<FieldError
						errors={[
							errors.postalCode ? { message: errors.postalCode } : undefined,
						]}
					/>
				</Field>
			</div>
			<FieldDescription>
				Entregamos en {DELIVERY_AREA.city}, {DELIVERY_AREA.state}.
			</FieldDescription>
			<div className="flex flex-wrap gap-2">
				<Button disabled={saving} type="submit">
					<SaveIcon data-icon="inline-start" />
					{saving ? "Guardando..." : "Guardar dirección"}
				</Button>
				{onCancel ? (
					<Button
						disabled={saving}
						onClick={onCancel}
						type="button"
						variant="ghost"
					>
						Cancelar
					</Button>
				) : null}
			</div>
		</form>
	);
}
