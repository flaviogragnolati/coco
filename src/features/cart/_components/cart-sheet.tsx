"use client";

import { CartSheetView } from "~/features/cart/_components/cart-sheet-view";
import { useCartActions } from "~/features/cart/use-cart-sync";
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
	const mergeBlocked = useCartStore(
		(state) => state.bootstrapState === "blocked",
	);
	const cartActions = useCartActions({ isAuthenticated, userId });

	return (
		<CartSheetView
			cart={cartActions.cart}
			hasHydrated={hasHydrated}
			isAuthenticated={isAuthenticated}
			isPending={cartActions.isPending}
			mergeBlocked={mergeBlocked}
			onDecrement={cartActions.decrement}
			onIncrement={cartActions.increment}
			onNavigate={closeMiniCart}
			onOpenChange={setMiniCartOpen}
			onQuantityCommit={cartActions.updateQuantity}
			onRemove={cartActions.removeItem}
			open={isOpen}
		/>
	);
}
