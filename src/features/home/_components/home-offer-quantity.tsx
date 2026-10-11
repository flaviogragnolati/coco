"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { homeOfferTerms } from "~/features/cart/cart-mappers";
import {
	PurchasePanel,
	usePurchaseQuantity,
} from "~/features/catalog/_components/purchase-panel";
import type { HomeOffer } from "~/shared/common/home.types";
import { useCartStore } from "~/store/cart-store";

type HomeOfferQuantityState = {
	quantity: string;
	setQuantity: (quantity: string) => void;
};

const HomeOfferQuantityContext = createContext<HomeOfferQuantityState | null>(
	null,
);

export function HomeOfferQuantityProvider({
	offer,
	children,
}: {
	offer: HomeOffer;
	children: ReactNode;
}) {
	const [quantity, setQuantity] = usePurchaseQuantity(homeOfferTerms(offer));
	const value = useMemo(
		() => ({ quantity, setQuantity }),
		[quantity, setQuantity],
	);
	return (
		<HomeOfferQuantityContext.Provider value={value}>
			{children}
		</HomeOfferQuantityContext.Provider>
	);
}

/** The card's selected quantity, or the MOQ outside a home offer card. */
export function useHomeOfferQuantity(offer: HomeOffer) {
	return useContext(HomeOfferQuantityContext)?.quantity ?? offer.moq;
}

export function useHomeOfferCartQuantity(offer: HomeOffer) {
	return useCartStore((state) =>
		state.hasHydrated
			? (state.items[String(offer.productClientTermsId)]?.quantity ?? null)
			: null,
	);
}

export function HomeOfferPurchasePanel({
	offer,
	action,
	size,
}: {
	offer: HomeOffer;
	action?: ReactNode;
	size?: "default" | "hero";
}) {
	const state = useContext(HomeOfferQuantityContext);
	const hasHydrated = useCartStore((store) => store.hasHydrated);
	const cartQuantity = useHomeOfferCartQuantity(offer);
	if (!state) {
		throw new Error(
			"HomeOfferPurchasePanel must render inside HomeOfferQuantityProvider",
		);
	}

	return (
		<PurchasePanel
			action={action}
			disabled={!hasHydrated}
			inCartQuantity={cartQuantity}
			onQuantityChange={state.setQuantity}
			presentation={offer}
			quantity={state.quantity}
			size={size}
			terms={homeOfferTerms(offer)}
			unit={offer.unit}
		/>
	);
}
