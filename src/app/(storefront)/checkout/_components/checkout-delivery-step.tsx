"use client";

import {
	CheckCircle2Icon,
	ExternalLinkIcon,
	HomeIcon,
	StoreIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import type { CheckoutAddress } from "~/shared/common/checkout.types";
import {
	type DeliveryPreference,
	deliveryPreferenceLabelMap,
	formatAddressLine,
} from "~/shared/common/delivery-display";
import type { PickupPointData } from "~/shared/common/pickup-point-snapshot";
import { CheckoutAddressStep } from "./checkout-address-step";
import { SelectableTile } from "./selectable-tile";

/** The delivery the customer has picked so far, resolved to its record. */
export type CheckoutDeliverySelection =
	| { mode: "homeDelivery"; address: CheckoutAddress }
	| { mode: "pickupPoint"; pickupPoint: PickupPointData };

const modeDescriptions: Record<DeliveryPreference, string> = {
	homeDelivery: "Te lo llevamos a la dirección que elijas.",
	pickupPoint: "Lo retirás en uno de nuestros puntos, en su horario.",
};

const modeIcons = {
	homeDelivery: HomeIcon,
	pickupPoint: StoreIcon,
} satisfies Record<DeliveryPreference, unknown>;

function PickupPointList({
	pickupPoints,
	selectedPickupPointId,
	onSelect,
}: {
	pickupPoints: PickupPointData[];
	selectedPickupPointId: number | null;
	onSelect: (id: number) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Elegí un punto de retiro</CardTitle>
				<CardDescription>
					Te avisamos cuando tu pedido esté disponible para retirar.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{pickupPoints.map((point) => {
					const selected = point.id === selectedPickupPointId;

					return (
						<SelectableTile
							actions={
								<>
									{selected ? (
										<Badge variant="success">
											<CheckCircle2Icon data-icon="inline-start" />
											Seleccionado
										</Badge>
									) : null}
									{point.googleMapsUrl ? (
										<a
											className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
											href={point.googleMapsUrl}
											rel="noreferrer"
											target="_blank"
										>
											Ver en el mapa
											<ExternalLinkIcon className="size-3" />
										</a>
									) : null}
								</>
							}
							key={point.id}
							onSelect={() => onSelect(point.id)}
							selected={selected}
						>
							<span className="flex items-center gap-2 font-medium text-sm">
								{selected ? (
									<CheckCircle2Icon className="size-4 text-success" />
								) : (
									<StoreIcon className="size-4 text-muted-foreground" />
								)}
								{point.name}
							</span>
							<span className="text-muted-foreground text-xs/relaxed">
								{formatAddressLine(point)}
							</span>
							<span className="text-xs">{point.hours}</span>
							{point.instructions ? (
								<span className="text-muted-foreground text-xs/relaxed">
									{point.instructions}
								</span>
							) : null}
						</SelectableTile>
					);
				})}
			</CardContent>
		</Card>
	);
}

/**
 * "Entrega": home delivery to one of the customer's addresses, or a pickup point.
 * With no active point the mode choice is hidden and the step is the address
 * list it always was.
 */
export function CheckoutDeliveryStep({
	deliveryMode,
	onDeliveryModeChange,
	addresses,
	selectedAddressId,
	onSelectAddress,
	onAddAddress,
	onEditAddress,
	pickupPoints,
	selectedPickupPointId,
	onSelectPickupPoint,
}: {
	deliveryMode: DeliveryPreference;
	onDeliveryModeChange: (mode: DeliveryPreference) => void;
	addresses: CheckoutAddress[];
	selectedAddressId: number | null;
	onSelectAddress: (id: number) => void;
	onAddAddress: () => void;
	onEditAddress: (address: CheckoutAddress) => void;
	pickupPoints: PickupPointData[];
	selectedPickupPointId: number | null;
	onSelectPickupPoint: (id: number) => void;
}) {
	const offersPickup = pickupPoints.length > 0;
	const mode = offersPickup ? deliveryMode : "homeDelivery";

	return (
		<div className="flex flex-col gap-4">
			{offersPickup ? (
				<Card>
					<CardHeader>
						<CardTitle>¿Cómo lo recibís?</CardTitle>
						<CardDescription>
							Las dos opciones cuestan lo mismo.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 md:grid-cols-2">
						{(["homeDelivery", "pickupPoint"] as const).map((option) => {
							const Icon = modeIcons[option];

							return (
								<SelectableTile
									key={option}
									onSelect={() => onDeliveryModeChange(option)}
									selected={mode === option}
								>
									<span className="flex items-center gap-2 font-medium text-sm">
										<Icon className="size-4 text-muted-foreground" />
										{deliveryPreferenceLabelMap[option]}
									</span>
									<span className="text-muted-foreground text-xs/relaxed">
										{modeDescriptions[option]}
									</span>
								</SelectableTile>
							);
						})}
					</CardContent>
				</Card>
			) : null}

			{mode === "pickupPoint" ? (
				<PickupPointList
					onSelect={onSelectPickupPoint}
					pickupPoints={pickupPoints}
					selectedPickupPointId={selectedPickupPointId}
				/>
			) : (
				<CheckoutAddressStep
					addresses={addresses}
					onAdd={onAddAddress}
					onEdit={onEditAddress}
					onSelect={onSelectAddress}
					selectedAddressId={selectedAddressId}
				/>
			)}
		</div>
	);
}
