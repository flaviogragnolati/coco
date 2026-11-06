"use client";

import { discardPendingGuestItems } from "~/features/cart/discard-pending-guest-items";
import { useCartActions } from "~/features/cart/use-cart-sync";
import { useCartStore } from "~/store/cart-store";
import { CartPageView } from "./cart-page-view";

export function CartClient({
	isAuthenticated,
	userId,
}: {
	isAuthenticated: boolean;
	userId: string | null;
}) {
	const hasHydrated = useCartStore((state) => state.hasHydrated);
	const mergeBlocked = useCartStore(
		(state) => state.bootstrapState === "blocked",
	);
	const mergeBlockedMessage = useCartStore(
		(state) => state.bootstrapBlockedMessage,
	);
	const cartActions = useCartActions({ isAuthenticated, userId });

	return (
		<CartPageView
			cart={cartActions.cart}
			hasHydrated={hasHydrated}
			isAuthenticated={isAuthenticated}
			isPending={cartActions.isPending}
			mergeBlocked={mergeBlocked}
			mergeBlockedMessage={mergeBlockedMessage}
			onClear={cartActions.clear}
			onDecrement={cartActions.decrement}
			onDiscardPendingGuestItems={discardPendingGuestItems}
			onIncrement={cartActions.increment}
			onLeaveCheckout={cartActions.leaveCheckout}
			onQuantityCommit={cartActions.updateQuantity}
			onRemove={cartActions.removeItem}
		/>
	);
}
