"use client";

import { PackageSearchIcon, ShoppingCartIcon } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "~/components/page-header";
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
import { useCartActions } from "~/features/cart/use-cart-sync";
import { useCartStore } from "~/store/cart-store";
import { CartSummary } from "./cart-summary";

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

export function CartClient({
	isAuthenticated,
	userId,
}: {
	isAuthenticated: boolean;
	userId: string | null;
}) {
	const hasHydrated = useCartStore((state) => state.hasHydrated);
	const cartActions = useCartActions({ isAuthenticated, userId });
	const cart = cartActions.cart;

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
				description="Revisá cantidades, subtotales estimados y el estado antes de continuar."
				eyebrow="Carrito"
				title="Tu pedido mayorista compartido"
			/>

			{!hasHydrated ? (
				<CartLoadingState />
			) : cart.itemCount === 0 ? (
				<Empty className="border bg-brand-warm text-brand-warm-foreground">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PackageSearchIcon />
						</EmptyMedia>
						<EmptyTitle>Tu carrito está vacío</EmptyTitle>
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
					<section className="flex flex-col gap-3">
						{cart.items.map((item) => (
							<CartLineRow
								disabled={cartActions.isPending}
								item={item}
								key={item.productClientTermsId}
								onDecrement={cartActions.decrement}
								onIncrement={cartActions.increment}
								onQuantityCommit={cartActions.updateQuantity}
								onRemove={cartActions.removeItem}
								variant="full"
							/>
						))}
					</section>
					<CartSummary
						cart={cart}
						isAuthenticated={isAuthenticated}
						isPending={cartActions.isPending}
						onClear={cartActions.clear}
					/>
				</div>
			)}
		</main>
	);
}
