"use client";

import {
	AlertTriangleIcon,
	PackageSearchIcon,
	ShoppingCartIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageHeader } from "~/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import { Skeleton } from "~/components/ui/skeleton";
import { CartLineRow } from "~/features/cart/_components/cart-line-row";
import type { CartLineHandlers } from "~/features/cart/_components/cart-sheet-view";
import type { CartSnapshot } from "~/shared/common/cart.types";

type DataAttributes = { [key: `data-${string}`]: string };

function CartLoadingState() {
	return (
		<div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
			<div className="flex flex-col gap-3">
				<Skeleton className="h-32 w-full rounded-3xl" />
				<Skeleton className="h-32 w-full rounded-3xl" />
			</div>
			<Skeleton className="h-80 w-full rounded-4xl" />
		</div>
	);
}

/**
 * "Tu pedido": the products, the weekly closing and the "Finalizar" panel on
 * one page — there is no checkout screen (ADR 0015). Server-free on purpose:
 * the tutorial renders it on example data, so the panel and the closing come
 * in as slots.
 */
export function CartPageView({
	hasHydrated,
	cart,
	isPending,
	locked,
	lockedNotice,
	mergeBlocked,
	mergeBlockedMessage,
	onDecrement,
	onIncrement,
	onQuantityCommit,
	onRemove,
	onClear,
	onDiscardPendingGuestItems,
	closingSlot,
	finishSlot,
	targets,
}: CartLineHandlers & {
	hasHydrated: boolean;
	cart: CartSnapshot;
	isPending: boolean;
	/** The order is confirmed and waits for its payment: products are read-only. */
	locked: boolean;
	/** Why the products are read-only, under them. */
	lockedNotice?: string | null;
	mergeBlocked: boolean;
	mergeBlockedMessage: string | null;
	onClear: () => void;
	onDiscardPendingGuestItems: () => void;
	closingSlot?: ReactNode;
	finishSlot: ReactNode;
	/** Marks regions for an outside walkthrough; absent on the real page. */
	targets?: { lines?: DataAttributes; summary?: DataAttributes };
}) {
	const linesDisabled = isPending || locked || mergeBlocked;

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-8 pb-36 md:px-6 lg:pb-10">
			<PageHeader
				actions={
					<Button asChild variant="outline">
						<Link href="/products">
							<ShoppingCartIcon data-icon="inline-start" />
							Seguir comprando
						</Link>
					</Button>
				}
				eyebrow="Tu pedido"
				title="Tu pedido de la semana"
				tone="storefront"
			/>

			{mergeBlocked ? (
				<Alert variant="destructive">
					<AlertTriangleIcon />
					<AlertTitle>Productos pendientes de agregar</AlertTitle>
					<AlertDescription>
						{mergeBlockedMessage ??
							"No pudimos sumar estos productos a tu pedido."}{" "}
						Los productos de abajo quedaron guardados en este navegador y
						todavía no forman parte de tu pedido. Cuando se resuelva el pago en
						curso, recargá la página para agregarlos, o descartalos para retomar
						ese pago.
					</AlertDescription>
					<div className="col-start-2 mt-2">
						<Button
							onClick={onDiscardPendingGuestItems}
							size="sm"
							type="button"
							variant="outline"
						>
							Descartar productos pendientes
						</Button>
					</div>
				</Alert>
			) : null}

			{!hasHydrated ? (
				<CartLoadingState />
			) : cart.itemCount === 0 ? (
				<Empty className="border bg-brand-warm text-brand-warm-foreground">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PackageSearchIcon />
						</EmptyMedia>
						<EmptyTitle>Tu pedido está vacío</EmptyTitle>
						<EmptyDescription>
							Agregá productos del catálogo para empezar a armar tu pedido.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild variant="highlight">
							<Link href="/products">Ver productos</Link>
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<>
					{closingSlot}
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
						<section className="flex flex-col gap-3" {...targets?.lines}>
							{cart.items.map((item) => (
								<CartLineRow
									disabled={linesDisabled}
									item={item}
									key={item.productClientTermsId}
									onDecrement={onDecrement}
									onIncrement={onIncrement}
									onQuantityCommit={onQuantityCommit}
									onRemove={onRemove}
									variant="full"
								/>
							))}
							<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-muted-foreground text-sm">
								<p>
									{locked
										? (lockedNotice ??
											"Confirmaste este pedido. Para cambiar productos, volvé a editarlo.")
										: "Podés cambiar cantidades hasta el momento de confirmar."}
								</p>
								{locked ? null : (
									<Button
										disabled={linesDisabled}
										onClick={onClear}
										size="sm"
										type="button"
										variant="ghost"
									>
										Vaciar pedido
									</Button>
								)}
							</div>
						</section>
						{targets?.summary ? (
							<div className="contents" {...targets.summary}>
								{finishSlot}
							</div>
						) : (
							finishSlot
						)}
					</div>
				</>
			)}
		</main>
	);
}
