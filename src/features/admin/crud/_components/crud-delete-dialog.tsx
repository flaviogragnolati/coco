"use client";

import { useEffect, useState } from "react";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";

export function CrudDeleteDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmationValue,
	confirmationLabel = "Confirmación",
	confirmLabel,
	cancelLabel = "Cancelar",
	isPending,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmationValue?: string;
	confirmationLabel?: string;
	confirmLabel: string;
	cancelLabel?: string;
	isPending?: boolean;
	onConfirm: () => void;
}) {
	const [typedValue, setTypedValue] = useState("");
	const requiresConfirmation = Boolean(confirmationValue);
	const isConfirmed =
		!requiresConfirmation || typedValue === confirmationValue;

	useEffect(() => {
		if (!open) setTypedValue("");
	}, [open]);

	return (
		<AlertDialog onOpenChange={onOpenChange} open={open}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				{requiresConfirmation ? (
					<FieldGroup>
						<Field data-invalid={typedValue.length > 0 && !isConfirmed}>
							<FieldLabel htmlFor="delete-confirmation">
								{confirmationLabel}
							</FieldLabel>
							<Input
								aria-invalid={typedValue.length > 0 && !isConfirmed}
								autoComplete="off"
								id="delete-confirmation"
								onChange={(event) => setTypedValue(event.target.value)}
								placeholder={confirmationValue}
								value={typedValue}
							/>
							<FieldError>
								{typedValue.length > 0 && !isConfirmed
									? "El texto no coincide exactamente"
									: null}
							</FieldError>
						</Field>
					</FieldGroup>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>
						{cancelLabel}
					</AlertDialogCancel>
					<Button
						disabled={!isConfirmed || isPending}
						onClick={onConfirm}
						variant="destructive"
					>
						{confirmLabel}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
