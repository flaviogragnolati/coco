"use client";

import { ShoppingCartIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { homeOfferToCartItem } from "~/features/cart/cart-mappers";
import { useCartActions } from "~/features/cart/use-cart-sync";
import type { HomeOffer } from "~/shared/common/home.types";
import { useCartStore } from "~/store/cart-store";
import { useCartUiStore } from "~/store/cart-ui-store";
import {
	useHomeOfferCartQuantity,
	useHomeOfferQuantity,
} from "./home-offer-quantity";

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
	const inCart = useHomeOfferCartQuantity(offer) !== null;
	const quantity = useHomeOfferQuantity(offer);
	return (
		<Button
			className="w-full rounded-full"
			disabled={isPending || !hasHydrated}
			onClick={() => {
				if (!inCart) setItem(homeOfferToCartItem(offer, quantity));
				openMiniCart();
			}}
			variant="highlight"
		>
			<ShoppingCartIcon data-icon="inline-start" />
			{inCart ? "Ver en tu pedido" : "Sumar al pedido"}
		</Button>
	);
}
