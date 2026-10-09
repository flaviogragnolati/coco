"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { CrudFormDialogShell } from "~/features/admin/crud/_components/crud-form-dialog-shell";
import {
	type DeliveryPreference,
	deliveryPreferenceLabelMap,
	describeOrderDelivery,
	formatAddressLine,
	formatOrderDelivery,
} from "~/shared/common/delivery-display";
import { api } from "~/trpc/react";

const NEW_ADDRESS = "new";

const emptyAddress = {
	line1: "",
	line2: "",
	city: "Ushuaia",
	state: "Tierra del Fuego",
	postalCode: "",
	country: "AR",
};

type AddressField = keyof typeof emptyAddress;

const addressFieldLabels: Record<AddressField, string> = {
	line1: "Dirección",
	line2: "Piso o depto",
	city: "Ciudad",
	state: "Provincia",
	postalCode: "Código postal",
	country: "País",
};

/**
 * "Cambiar entrega": the admin side of a customer asking to receive the order
 * another way. The server refuses it while a package of the order is on an
 * end-user shipment; the dialog shows that reason instead of the form.
 */
export function OrderDeliveryChangeDialog({
	orderId,
	open,
	onOpenChange,
	onChanged,
}: {
	orderId: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onChanged: () => Promise<void> | void;
}) {
	const optionsQuery = api.admin.userOrder.deliveryOptions.useQuery(
		{ orderId },
		{ enabled: open },
	);
	const [mode, setMode] = useState<DeliveryPreference>("homeDelivery");
	const [addressChoice, setAddressChoice] = useState<string>(NEW_ADDRESS);
	const [address, setAddress] = useState(emptyAddress);
	const [pickupPointId, setPickupPointId] = useState<number | null>(null);
	const [reason, setReason] = useState("");

	const options = optionsQuery.data;

	useEffect(() => {
		if (!open || !options) return;
		setMode(
			options.deliveryPreference === "homeDelivery"
				? "pickupPoint"
				: "homeDelivery",
		);
		setAddressChoice(
			options.addresses[0] ? String(options.addresses[0].id) : NEW_ADDRESS,
		);
		setAddress(emptyAddress);
		setPickupPointId(options.pickupPoints[0]?.id ?? null);
		setReason("");
	}, [open, options]);

	const changeMutation =
		api.admin.userOrder.changeDeliveryPreference.useMutation({
			onSuccess: async () => {
				toast.success("Entrega cambiada", {
					description: "El cliente ve el cambio y el motivo en su seguimiento.",
				});
				onOpenChange(false);
				await onChanged();
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo cambiar la entrega");
			},
		});

	const typingAddress =
		mode === "homeDelivery" && addressChoice === NEW_ADDRESS;
	const targetReady =
		mode === "pickupPoint"
			? pickupPointId !== null
			: !typingAddress ||
				(address.line1.trim() !== "" &&
					address.city.trim() !== "" &&
					address.state.trim() !== "" &&
					address.postalCode.trim() !== "" &&
					address.country.trim() !== "");
	const canSubmit =
		Boolean(options) &&
		!options?.blockedReason &&
		targetReady &&
		reason.trim().length > 0 &&
		!changeMutation.isPending;

	const submit = () => {
		if (mode === "pickupPoint") {
			if (pickupPointId === null) return;
			changeMutation.mutate({
				orderId,
				delivery: { mode, pickupPointId },
				reason,
			});
			return;
		}

		changeMutation.mutate({
			orderId,
			delivery: {
				mode,
				address: typingAddress
					? {
							snapshot: {
								...address,
								type: "shipping",
								line2: address.line2.trim() || null,
							},
						}
					: { addressId: Number(addressChoice) },
			},
			reason,
		});
	};

	const current = options ? describeOrderDelivery(options) : null;

	return (
		<CrudFormDialogShell
			description="Cambia cómo recibe el cliente este pedido. Los próximos envíos tienen que respetar la nueva entrega."
			footer={
				<>
					<Button
						disabled={changeMutation.isPending}
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Volver
					</Button>
					<Button disabled={!canSubmit} onClick={submit} type="button">
						Cambiar entrega
					</Button>
				</>
			}
			onOpenChange={onOpenChange}
			open={open}
			title={`Cambiar entrega de ${options?.orderCode ?? "pedido"}`}
		>
			{optionsQuery.isLoading ? (
				<Skeleton className="h-40 w-full" />
			) : optionsQuery.isError ? (
				<p className="text-destructive text-xs">{optionsQuery.error.message}</p>
			) : options ? (
				<FieldGroup>
					<p className="text-xs">
						<span className="text-muted-foreground">Entrega actual: </span>
						{current
							? formatOrderDelivery(current)
							: "Sin elección (pedido anterior)"}
					</p>

					{options.blockedReason ? (
						<Alert>
							<AlertDescription>{options.blockedReason}</AlertDescription>
						</Alert>
					) : (
						<>
							<Field>
								<FieldLabel htmlFor="order-delivery-mode">
									Nueva entrega
								</FieldLabel>
								<Select
									id="order-delivery-mode"
									onChange={(event) =>
										setMode(event.target.value as DeliveryPreference)
									}
									value={mode}
								>
									<option value="homeDelivery">
										{deliveryPreferenceLabelMap.homeDelivery}
									</option>
									<option value="pickupPoint">
										{deliveryPreferenceLabelMap.pickupPoint}
									</option>
								</Select>
							</Field>

							{mode === "pickupPoint" ? (
								<Field>
									<FieldLabel htmlFor="order-delivery-point">
										Punto de retiro
									</FieldLabel>
									<Select
										id="order-delivery-point"
										onChange={(event) =>
											setPickupPointId(
												event.target.value ? Number(event.target.value) : null,
											)
										}
										value={pickupPointId ?? ""}
									>
										<option value="">Elegí un punto</option>
										{options.pickupPoints.map((point) => (
											<option key={point.id} value={point.id}>
												{point.name} — {formatAddressLine(point)}
											</option>
										))}
									</Select>
									<FieldDescription>
										Solo se ofrecen los puntos activos.
									</FieldDescription>
								</Field>
							) : (
								<>
									<Field>
										<FieldLabel htmlFor="order-delivery-address">
											Dirección
										</FieldLabel>
										<Select
											id="order-delivery-address"
											onChange={(event) => setAddressChoice(event.target.value)}
											value={addressChoice}
										>
											{options.addresses.map((saved) => (
												<option key={saved.id} value={saved.id}>
													{formatAddressLine(saved)}
												</option>
											))}
											<option value={NEW_ADDRESS}>Otra dirección</option>
										</Select>
										<FieldDescription>
											Una dirección nueva queda solo en este pedido, no en el
											perfil del cliente.
										</FieldDescription>
									</Field>
									{typingAddress ? (
										<div className="grid gap-3 md:grid-cols-2">
											{(Object.keys(addressFieldLabels) as AddressField[]).map(
												(field) => (
													<Field key={field}>
														<FieldLabel htmlFor={`order-delivery-${field}`}>
															{addressFieldLabels[field]}
														</FieldLabel>
														<Input
															id={`order-delivery-${field}`}
															onChange={(event) =>
																setAddress((currentAddress) => ({
																	...currentAddress,
																	[field]: event.target.value,
																}))
															}
															value={address[field]}
														/>
													</Field>
												),
											)}
										</div>
									) : null}
								</>
							)}

							<Field>
								<FieldLabel htmlFor="order-delivery-reason">Motivo</FieldLabel>
								<Textarea
									id="order-delivery-reason"
									maxLength={500}
									onChange={(event) => setReason(event.target.value)}
									rows={3}
									value={reason}
								/>
								<FieldDescription>
									El cliente va a leer este motivo tal cual en el seguimiento de
									su pedido.
								</FieldDescription>
							</Field>
						</>
					)}
				</FieldGroup>
			) : null}
		</CrudFormDialogShell>
	);
}
