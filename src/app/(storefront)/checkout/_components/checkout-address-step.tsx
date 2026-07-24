"use client";

import {
	CheckCircle2Icon,
	MapPinIcon,
	PencilIcon,
	PlusIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import { cn } from "~/lib/utils";
import type { CheckoutAddress } from "~/shared/common/checkout.types";

export function CheckoutAddressStep({
	addresses,
	selectedAddressId,
	onAdd,
	onEdit,
	onSelect,
}: {
	addresses: CheckoutAddress[];
	selectedAddressId: number | null;
	onAdd: () => void;
	onEdit: (address: CheckoutAddress) => void;
	onSelect: (id: number) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<CardTitle>Dirección de envío</CardTitle>
						<CardDescription>
							Elegí dónde recibir tu parte del pedido mayorista.
						</CardDescription>
					</div>
					<Button onClick={onAdd} type="button" variant="outline">
						<PlusIcon data-icon="inline-start" />
						Nueva
					</Button>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{addresses.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<MapPinIcon />
							</EmptyMedia>
							<EmptyTitle>Sin direcciones guardadas</EmptyTitle>
							<EmptyDescription>
								Agregá una dirección para continuar con el checkout.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button onClick={onAdd} type="button">
								<PlusIcon data-icon="inline-start" />
								Agregar dirección
							</Button>
						</EmptyContent>
					</Empty>
				) : (
					<div className="flex flex-col gap-3">
						{addresses.map((address) => {
							const selected = address.id === selectedAddressId;

							return (
								<div
									className={cn(
										"flex flex-col gap-3 rounded-3xl bg-card p-3 shadow-sm ring-1 ring-foreground/5 transition-all md:flex-row md:items-start md:justify-between dark:ring-foreground/10",
										selected && "ring-2 ring-success/40",
									)}
									key={address.id}
								>
									<button
										aria-pressed={selected}
										className="flex flex-1 flex-col gap-1 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
										onClick={() => onSelect(address.id)}
										type="button"
									>
										<span className="flex items-center gap-2 font-medium text-sm">
											{selected ? (
												<CheckCircle2Icon className="size-4 text-success" />
											) : (
												<MapPinIcon className="size-4 text-muted-foreground" />
											)}
											{address.line1}
										</span>
										<span className="text-muted-foreground text-xs/relaxed">
											{address.line2 ? `${address.line2}, ` : ""}
											{address.city}, {address.state} {address.postalCode}
										</span>
										<span className="text-muted-foreground text-xs">
											{address.country}
										</span>
									</button>
									<div className="flex items-center gap-2">
										{selected ? (
											<Badge variant="success">
												<CheckCircle2Icon data-icon="inline-start" />
												Seleccionada
											</Badge>
										) : null}
										<Button
											onClick={() => onEdit(address)}
											size="sm"
											type="button"
											variant="outline"
										>
											<PencilIcon data-icon="inline-start" />
											Editar
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
