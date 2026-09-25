"use client";

import { ShoppingCartIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { homeOfferToCartItem } from "~/features/cart/cart-mappers";
import { useCartActions } from "~/features/cart/use-cart-sync";
import type { HomeOffer } from "~/shared/common/home.types";
import { useCartStore } from "~/store/cart-store";
import { useCartUiStore } from "~/store/cart-ui-store";

export function HomeOfferAddButton({
	offer,
	isAuthenticated,
	userId,
}: {
	offer: HomeOffer;
	isAuthenticated: boolean;
	userId: string | null;
}) {
	const { setItem, isPending } = useCartActions({ isAuthenticated, userId });
	const openMiniCart = useCartUiStore((state) => state.openMiniCart);
	const hasHydrated = useCartStore((state) => state.hasHydrated);
	const inCart = useCartStore(
		(state) =>
			state.hasHydrated &&
			Boolean(state.items[String(offer.productClientTermsId)]),
	);
	return (
		<Button
			className="w-full rounded-full"
			disabled={isPending || !hasHydrated}
			onClick={() => {
				if (!inCart) setItem(homeOfferToCartItem(offer));
				openMiniCart();
			}}
			variant="highlight"
		>
			<ShoppingCartIcon data-icon="inline-start" />
			{inCart ? "Ver en tu pedido" : "Sumar al pedido"}
		</Button>
	);
}
