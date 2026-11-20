"use client";

import {
	AlertTriangleIcon,
	PackageSearchIcon,
	ShoppingCartIcon,
} from "lucide-react";
import Link from "next/link";

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
import { CartSummary } from "./cart-summary";

type DataAttributes = { [key: `data-${string}`]: string };

function CartLoadingState() {
	return (
		<div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
			<div className="flex flex-col gap-3">
				<Skeleton className="h-32 w-full rounded-3xl" />
				<Skeleton className="h-32 w-full rounded-3xl" />
			</div>
			<Skeleton className="h-80 w-full rounded-4xl" />
		</div>
	);
}

export function CartPageView({
	hasHydrated,
	cart,
	isAuthenticated,
	isPending,
	mergeBlocked,
	mergeBlockedMessage,
	onDecrement,
	onIncrement,
	onQuantityCommit,
	onRemove,
	onClear,
	onLeaveCheckout,
	onDiscardPendingGuestItems,
	targets,
	transferDiscountPercent,
}: CartLineHandlers & {
	hasHydrated: boolean;
	cart: CartSnapshot;
	isAuthenticated: boolean;
	isPending: boolean;
	mergeBlocked: boolean;
	mergeBlockedMessage: string | null;
	onClear: () => void;
	onLeaveCheckout: () => void;
	onDiscardPendingGuestItems: () => void;
	/** Marks regions for an outside walkthrough; absent on the real page. */
	targets?: { lines?: DataAttributes; summary?: DataAttributes };
	transferDiscountPercent: number | null;
}) {
	const summary = (
		<CartSummary
			cart={cart}
			checkoutBlocked={mergeBlocked}
			isAuthenticated={isAuthenticated}
			isPending={isPending}
			onClear={onClear}
			onLeaveCheckout={onLeaveCheckout}
			transferDiscountPercent={transferDiscountPercent}
		/>
	);

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
			<PageHeader
				actions={
					<Button asChild variant="outline">
						<Link href="/products">
							<ShoppingCartIcon data-icon="inline-start" />
							Seguir comprando
						</Link>
					</Button>
				}
				description="Lo que vas a pagar al confirmar."
				title="Tu pedido"
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
				<div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
					<section className="flex flex-col gap-3" {...targets?.lines}>
						{cart.items.map((item) => (
							<CartLineRow
								disabled={
									isPending || cart.status === "atCheckout" || mergeBlocked
								}
								item={item}
								key={item.productClientTermsId}
								onDecrement={onDecrement}
								onIncrement={onIncrement}
								onQuantityCommit={onQuantityCommit}
								onRemove={onRemove}
								variant="full"
							/>
						))}
					</section>
					{targets?.summary ? (
						<div className="contents" {...targets.summary}>
							{summary}
						</div>
					) : (
						summary
					)}
				</div>
			)}
		</main>
	);
}
