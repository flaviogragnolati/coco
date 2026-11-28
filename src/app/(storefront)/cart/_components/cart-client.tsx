"use client";

import { discardPendingGuestItems } from "~/features/cart/discard-pending-guest-items";
import { useCartActions } from "~/features/cart/use-cart-sync";
import { FinishOrder } from "~/features/checkout/finish-order.container";
import {
	FinishOrderGuestPanel,
	FinishOrderNoticePanel,
} from "~/features/checkout/finish-order-panel";
import { useCheckoutOptions } from "~/features/checkout/use-checkout-options";
import { ClosingNotice } from "~/features/weekly-closing/closing-notice";
import { useCartStore } from "~/store/cart-store";
import { api } from "~/trpc/react";
import { CartPageView } from "./cart-page-view";

const MERGE_BLOCKED_REASON =
	"Hay productos pendientes de agregar a tu pedido. Esperá a que se resuelva el pago en curso.";

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
	const cart = cartActions.cart;
	const signedIn = isAuthenticated && userId !== null;
	const transferDiscount = api.catalog.transferDiscount.useQuery(undefined, {
		enabled: !signedIn,
		staleTime: 5 * 60_000,
	});
	const options = useCheckoutOptions({
		enabled: signedIn && hasHydrated && cart.itemCount > 0 && !mergeBlocked,
		cartStatus: cart.status,
	});

	const liveOrder = options.state?.liveOrder ?? null;
	// Until the state arrives, a frozen cart stays read-only; once it does, only
	// a cart with an order waiting on it is (a frozen cart without one is left
	// over from the old checkout and an edit releases it).
	const locked =
		liveOrder !== null ||
		(cart.status === "atCheckout" && options.state === null);
	const total = cart.totals[0];

	const finishSlot = !total ? null : !signedIn || !userId ? (
		<FinishOrderGuestPanel
			itemCount={cart.itemCount}
			total={total}
			transferDiscountPercent={transferDiscount.data?.percent ?? null}
		/>
	) : mergeBlocked ? (
		<FinishOrderNoticePanel>{MERGE_BLOCKED_REASON}</FinishOrderNoticePanel>
	) : (
		<FinishOrder
			blockedReason={null}
			cart={cart}
			cartBusy={cartActions.isPending}
			leaving={cartActions.isPending}
			onLeaveCheckout={cartActions.leaveCheckout}
			options={options}
			userId={userId}
		/>
	);

	return (
		<CartPageView
			cart={cart}
			closingSlot={
				<ClosingNotice variant={liveOrder ? "awaitingPayment" : "cart"} />
			}
			finishSlot={finishSlot}
			hasHydrated={hasHydrated}
			isPending={cartActions.isPending}
			locked={locked}
			lockedNotice={
				liveOrder
					? `Confirmaste el pedido ${liveOrder.code} y espera el pago. Para cambiar productos, volvé a editarlo.`
					: null
			}
			mergeBlocked={mergeBlocked}
			mergeBlockedMessage={mergeBlockedMessage}
			onClear={cartActions.clear}
			onDecrement={cartActions.decrement}
			onDiscardPendingGuestItems={discardPendingGuestItems}
			onIncrement={cartActions.increment}
			onQuantityCommit={cartActions.updateQuantity}
			onRemove={cartActions.removeItem}
		/>
	);
}
