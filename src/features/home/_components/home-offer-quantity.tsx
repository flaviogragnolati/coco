"use client";

import { CheckIcon } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
import { QuantityStepper } from "~/features/cart/_components/quantity-stepper";
import { homeOfferTerms } from "~/features/cart/cart-mappers";
import {
	getNextQuantity,
	getPreviousQuantity,
	isFixedQuantity,
	normalizeCartQuantity,
} from "~/shared/common/commerce.helpers";
import type { HomeOffer } from "~/shared/common/home.types";
import { useCartStore } from "~/store/cart-store";
import {
	getOfferFixedQuantityLabel,
	getOfferInCartLabel,
	getOfferTotalLabel,
} from "../home-formatters";

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
	const [quantity, setQuantity] = useState(() =>
		normalizeCartQuantity(offer.moq, homeOfferTerms(offer)),
	);
	const value = useMemo(() => ({ quantity, setQuantity }), [quantity]);
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

export function HomeOfferQuantity({ offer }: { offer: HomeOffer }) {
	const state = useContext(HomeOfferQuantityContext);
	const hasHydrated = useCartStore((store) => store.hasHydrated);
	const cartQuantity = useHomeOfferCartQuantity(offer);
	if (!state) {
		throw new Error(
			"HomeOfferQuantity must render inside HomeOfferQuantityProvider",
		);
	}
	const terms = homeOfferTerms(offer);

	if (cartQuantity !== null) {
		return (
			<p className="flex items-center gap-1.5 font-medium text-sm text-success">
				<CheckIcon aria-hidden="true" className="size-4 shrink-0" />
				{getOfferInCartLabel(cartQuantity, offer.unit)}
			</p>
		);
	}

	if (isFixedQuantity(terms)) {
		return (
			<p className="font-medium text-sm">
				{getOfferFixedQuantityLabel(terms, offer.unit)}
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<QuantityStepper
				className="flex-wrap"
				disabled={!hasHydrated}
				onCommit={state.setQuantity}
				onDecrement={() =>
					state.setQuantity(getPreviousQuantity(state.quantity, terms))
				}
				onIncrement={() =>
					state.setQuantity(getNextQuantity(state.quantity, terms))
				}
				terms={terms}
				unit={offer.unit}
				value={state.quantity}
			/>
			<p aria-live="polite" className="font-medium text-sm">
				{getOfferTotalLabel(terms, state.quantity)}
			</p>
		</div>
	);
}
