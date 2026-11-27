"use client";

import {
	CheckCircle2Icon,
	ExternalLinkIcon,
	HomeIcon,
	PencilIcon,
	PlusIcon,
	StoreIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { cn } from "~/lib/utils";
import type {
	CheckoutAddress,
	CheckoutAddressCreateInput,
	CheckoutAddressUpdateInput,
} from "~/shared/common/checkout.types";
import {
	type DeliveryPreference,
	deliveryPreferenceLabelMap,
} from "~/shared/common/delivery-display";
import type { PickupPointData } from "~/shared/common/pickup-point-snapshot";
import { AddressForm } from "./address-form";
import type { FinishSelection } from "./finish-order";
import { SelectableTile } from "./selectable-tile";

const modeIcons = {
	homeDelivery: HomeIcon,
	pickupPoint: StoreIcon,
} satisfies Record<DeliveryPreference, unknown>;

function ModeSwitch({
	mode,
	onChange,
}: {
	mode: DeliveryPreference;
	onChange: (mode: DeliveryPreference) => void;
}) {
	return (
		<div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
			{(["homeDelivery", "pickupPoint"] as const).map((option) => {
				const Icon = modeIcons[option];
				return (
					<button
						aria-pressed={mode === option}
						className={cn(
							"flex items-center justify-center gap-2 rounded-full px-3 py-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
							mode === option
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
						key={option}
						onClick={() => onChange(option)}
						type="button"
					>
						<Icon aria-hidden="true" className="size-4" />
						{deliveryPreferenceLabelMap[option]}
					</button>
				);
			})}
		</div>
	);
}

function SelectedMark({ selected }: { selected: boolean }) {
	return selected ? (
		<CheckCircle2Icon aria-hidden="true" className="size-4 text-success" />
	) : null;
}

/**
 * "¿Cómo lo recibís?": home delivery to a saved address, or a pickup point.
 * A side sheet on desktop and a bottom sheet on a phone. A first purchase
 * opens straight on the address form; "Listo" waits until there is one.
 */
export function DeliverySheet({
	open,
	onOpenChange,
	side,
	addresses,
	pickupPoints,
	selection,
	onModeChange,
	onSelectAddress,
	onSelectPickupPoint,
	onSaveAddress,
	savingAddress,
	modal = true,
	inert,
	targets,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	side: "right" | "bottom";
	addresses: CheckoutAddress[];
	pickupPoints: PickupPointData[];
	selection: FinishSelection;
	onModeChange: (mode: DeliveryPreference) => void;
	onSelectAddress: (id: number) => void;
	onSelectPickupPoint: (id: number) => void;
	onSaveAddress: (
		input: CheckoutAddressCreateInput | CheckoutAddressUpdateInput,
	) => Promise<CheckoutAddress>;
	savingAddress: boolean;
	/** The tutorial shows it open without trapping its own controls. */
	modal?: boolean;
	/** Set on the portaled content itself: the sheet escapes any inert ancestor. */
	inert?: boolean;
	/** Marks the content for an outside walkthrough; absent on the real page. */
	targets?: { content?: { [key: `data-${string}`]: string } };
}) {
	// `null`: the list; `"new"`: a new address; an address: editing it.
	const [editing, setEditing] = useState<"new" | CheckoutAddress | null>(null);
	const offersPickup = pickupPoints.length > 0;
	const mode = selection.deliveryMode;
	const firstAddress = mode === "homeDelivery" && addresses.length === 0;
	const showForm =
		mode === "homeDelivery" && (firstAddress || editing !== null);
	const ready =
		mode === "pickupPoint"
			? selection.pickupPoint !== null
			: selection.address !== null;

	const handleSave = async (
		input: CheckoutAddressCreateInput | CheckoutAddressUpdateInput,
	) => {
		try {
			const saved = await onSaveAddress(input);
			onSelectAddress(saved.id);
			setEditing(null);
		} catch {
			// The hook already told the customer what went wrong.
		}
	};

	return (
		<Sheet
			modal={modal}
			onOpenChange={(next) => {
				if (!next) setEditing(null);
				onOpenChange(next);
			}}
			open={open}
		>
			<SheetContent
				className={cn(
					"gap-0",
					side === "bottom" ? "rounded-t-4xl" : "w-full sm:max-w-lg",
				)}
				inert={inert}
				side={side}
				{...targets?.content}
			>
				<SheetHeader className="pr-14">
					<SheetTitle className="font-heading text-xl">
						¿Cómo lo recibís?
					</SheetTitle>
					<SheetDescription>
						{offersPickup
							? "Las dos opciones cuestan lo mismo."
							: "Te lo llevamos a la dirección que elijas."}
					</SheetDescription>
				</SheetHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
					{offersPickup ? (
						<ModeSwitch
							mode={mode}
							onChange={(next) => {
								setEditing(null);
								onModeChange(next);
							}}
						/>
					) : null}

					{mode === "pickupPoint" ? (
						<div className="flex flex-col gap-3">
							{pickupPoints.map((point) => {
								const selected = selection.pickupPoint?.id === point.id;
								return (
									<SelectableTile
										actions={
											point.googleMapsUrl ? (
												<a
													className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
													href={point.googleMapsUrl}
													rel="noreferrer"
													target="_blank"
												>
													Ver en el mapa
													<ExternalLinkIcon
														aria-hidden="true"
														className="size-3"
													/>
												</a>
											) : null
										}
										key={point.id}
										onSelect={() => onSelectPickupPoint(point.id)}
										selected={selected}
									>
										<span className="flex items-center gap-2 font-medium text-sm">
											<SelectedMark selected={selected} />
											{point.name}
										</span>
										<span className="text-muted-foreground text-xs/relaxed">
											{[point.line1, point.line2].filter(Boolean).join(", ")}
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
						</div>
					) : showForm ? (
						<div className="flex flex-col gap-3">
							<h3 className="font-heading font-semibold">
								{editing && editing !== "new"
									? "Editar dirección"
									: firstAddress
										? "¿Dónde lo recibís?"
										: "Nueva dirección"}
							</h3>
							<AddressForm
								address={editing && editing !== "new" ? editing : null}
								key={editing && editing !== "new" ? editing.id : "new"}
								onCancel={firstAddress ? undefined : () => setEditing(null)}
								onSubmit={handleSave}
								saving={savingAddress}
							/>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{addresses.map((address) => {
								const selected = selection.address?.id === address.id;
								return (
									<SelectableTile
										actions={
											<Button
												onClick={() => setEditing(address)}
												size="sm"
												type="button"
												variant="ghost"
											>
												<PencilIcon data-icon="inline-start" />
												Editar
											</Button>
										}
										key={address.id}
										onSelect={() => onSelectAddress(address.id)}
										selected={selected}
									>
										<span className="flex items-center gap-2 font-medium text-sm">
											<SelectedMark selected={selected} />
											{[address.line1, address.line2]
												.filter(Boolean)
												.join(", ")}
										</span>
										<span className="text-muted-foreground text-xs">
											{[address.city, address.state].filter(Boolean).join(", ")}
										</span>
									</SelectableTile>
								);
							})}
							<Button
								className="self-start"
								onClick={() => setEditing("new")}
								type="button"
								variant="ghost"
							>
								<PlusIcon data-icon="inline-start" />
								Agregar otra dirección
							</Button>
						</div>
					)}
				</div>

				<SheetFooter className="border-t pt-4">
					<Button
						disabled={!ready || showForm}
						onClick={() => onOpenChange(false)}
						size="lg"
						type="button"
					>
						Listo
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
