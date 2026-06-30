"use client";

import { LogInIcon, PackageSearchIcon, ShoppingBagIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import { Separator } from "~/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { CartLineRow } from "~/features/cart/_components/cart-line-row";
import { useCartActions } from "~/features/cart/use-cart-sync";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { useCartStore } from "~/store/cart-store";
import { useCartUiStore } from "~/store/cart-ui-store";

export function CartSheet({
	isAuthenticated,
	userId,
}: {
	isAuthenticated: boolean;
	userId: string | null;
}) {
	const isOpen = useCartUiStore((state) => state.isMiniCartOpen);
	const setMiniCartOpen = useCartUiStore((state) => state.setMiniCartOpen);
	const closeMiniCart = useCartUiStore((state) => state.closeMiniCart);
	const hasHydrated = useCartStore((state) => state.hasHydrated);
	const cartActions = useCartActions({ isAuthenticated, userId });
	const cart = cartActions.cart;
	const hasItems = cart.itemCount > 0;

	return (
		<Sheet onOpenChange={setMiniCartOpen} open={isOpen}>
			<SheetContent className="gap-0" side="right">
				<SheetHeader>
					<div className="flex items-center justify-between gap-3 pr-8">
						<SheetTitle>Tu carrito</SheetTitle>
						{hasHydrated && hasItems ? (
							<Badge variant="secondary">
								{cart.itemCount} {cart.itemCount === 1 ? "línea" : "líneas"}
							</Badge>
						) : null}
					</div>
					<SheetDescription>
						Revisá cantidades y subtotales antes de ir al carrito completo.
					</SheetDescription>
				</SheetHeader>

				{!hasHydrated ? (
					<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
						<Skeleton className="h-24 w-full rounded-3xl" />
						<Skeleton className="h-24 w-full rounded-3xl" />
					</div>
				) : hasItems ? (
					<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
						{cart.items.map((item) => (
							<CartLineRow
								disabled={cartActions.isPending}
								item={item}
								key={item.productClientTermsId}
								onDecrement={cartActions.decrement}
								onIncrement={cartActions.increment}
								onQuantityCommit={cartActions.updateQuantity}
								onRemove={cartActions.removeItem}
								variant="compact"
							/>
						))}
					</div>
				) : (
					<div className="flex flex-1 items-center px-6 py-4">
						<Empty>
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
								<Button asChild onClick={closeMiniCart}>
									<Link href="/products">Ver productos</Link>
								</Button>
							</EmptyContent>
						</Empty>
					</div>
				)}

				{hasHydrated && hasItems ? (
					<SheetFooter className="border-t pt-4">
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between gap-3">
								<span className="text-muted-foreground text-xs">
									Unidades acumuladas
								</span>
								<span className="font-medium text-sm">
									{cart.totalQuantity}
								</span>
							</div>
							<Separator />
							<span className="text-muted-foreground text-xs">
								Totales estimados
							</span>
							{cart.totals.map((total) => (
								<div
									className="flex items-center justify-between gap-3"
									key={total.currency}
								>
									<span className="text-xs">{total.currency}</span>
									<span className="font-heading font-semibold text-lg">
										{formatCurrency(total.amount, total.currency)}
									</span>
								</div>
							))}
						</div>
						{isAuthenticated ? (
							<Button asChild className="w-full" onClick={closeMiniCart}>
								<Link href="/checkout">
									<ShoppingBagIcon data-icon="inline-start" />
									Iniciar checkout
								</Link>
							</Button>
						) : (
							<Button asChild className="w-full" onClick={closeMiniCart}>
								<Link href="/login?callbackURL=/checkout">
									<LogInIcon data-icon="inline-start" />
									Registrarme o iniciar sesión
								</Link>
							</Button>
						)}
						<Button
							asChild
							className="w-full"
							onClick={closeMiniCart}
							variant="outline"
						>
							<Link href="/cart">Ver carrito completo</Link>
						</Button>
					</SheetFooter>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
