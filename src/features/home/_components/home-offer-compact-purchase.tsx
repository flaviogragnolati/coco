"use client";

import {
	homeOfferTerms,
	homeOfferToCartItem,
} from "~/features/cart/cart-mappers";
import { useCartActions } from "~/features/cart/use-cart-sync";
import { CompactPurchase } from "~/features/catalog/_components/compact-purchase";
import type { HomeOffer } from "~/shared/common/home.types";
import { useCartStore } from "~/store/cart-store";
import { useCartUiStore } from "~/store/cart-ui-store";

export function HomeOfferCompactPurchase({
	offer,
	isAuthenticated,
	userId,
}: {
	offer: HomeOffer;
	isAuthenticated: boolean;
	userId: string | null;
}) {
	const { setItem, updateQuantity, removeItem, isPending } = useCartActions({
		isAuthenticated,
		userId,
	});
	const openMiniCart = useCartUiStore((state) => state.openMiniCart);
	const hasHydrated = useCartStore((state) => state.hasHydrated);
	const cartItem = useCartStore((state) =>
		state.hasHydrated
			? state.items[String(offer.productClientTermsId)]
			: undefined,
	);
	const terms = homeOfferTerms(offer);
	return (
		<CompactPurchase
			disabled={isPending || !hasHydrated}
			inCartQuantity={cartItem?.quantity ?? null}
			name={offer.productName}
			onAdd={() => {
				setItem(homeOfferToCartItem(offer));
				openMiniCart();
			}}
			onQuantityChange={(quantity) => {
				if (cartItem) updateQuantity(cartItem, quantity);
			}}
			onRemove={() => removeItem(offer.productClientTermsId)}
			presentation={offer}
			terms={terms}
			unit={offer.unit}
		/>
	);
}
