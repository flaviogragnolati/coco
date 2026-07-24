"use client";

import { PackageSearchIcon, ShoppingCartIcon } from "lucide-react";
import Link from "next/link";

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
import { useCartActions } from "~/features/cart/use-cart-sync";
import { useCartStore } from "~/store/cart-store";
import { CartItemRow } from "./cart-item-row";
import { CartSummary } from "./cart-summary";

function CartLoadingState() {
	return (
		<div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
			<div className="flex flex-col gap-3">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
			<Skeleton className="h-80 w-full" />
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
			<section className="flex flex-col gap-2">
				<span className="text-muted-foreground text-xs uppercase tracking-wide">
					Carrito
				</span>
				<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div className="flex max-w-3xl flex-col gap-2">
						<h1 className="font-heading font-semibold text-3xl tracking-normal">
							Tu pedido mayorista compartido
						</h1>
						<p className="text-muted-foreground text-sm/relaxed">
							Revisa cantidades, subtotales estimados y el estado antes de
							continuar.
						</p>
					</div>
					<Button asChild variant="outline">
						<Link href="/products">
							<ShoppingCartIcon data-icon="inline-start" />
							Seguir comprando
						</Link>
					</Button>
				</div>
			</section>

			{!hasHydrated ? (
				<CartLoadingState />
			) : cart.itemCount === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<PackageSearchIcon />
						</EmptyMedia>
						<EmptyTitle>Tu carrito esta vacio</EmptyTitle>
						<EmptyDescription>
							Agrega productos del catalogo para empezar a armar tu pedido.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild>
							<Link href="/products">Ver productos</Link>
						</Button>
					</EmptyContent>
				</Empty>
			) : (
				<div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
					<section className="flex flex-col gap-3">
						{cart.items.map((item) => (
							<CartItemRow
								disabled={cartActions.isPending}
								item={item}
								key={item.productClientTermsId}
								onDecrement={cartActions.decrement}
								onIncrement={cartActions.increment}
								onQuantityCommit={cartActions.updateQuantity}
								onRemove={cartActions.removeItem}
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
