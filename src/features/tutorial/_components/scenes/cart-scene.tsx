import { CartPageView } from "~/app/(storefront)/cart/_components/cart-page-view";
import {
	TUTORIAL_TRANSFER_DISCOUNT_PERCENT,
	type TutorialFixtures,
} from "~/features/tutorial/tutorial-fixtures";
import { tutorialTarget } from "~/features/tutorial/tutorial-script";
import { noop } from "./noop";

/** As a guest: the walk-through signs in at checkout, like most customers do. */
export function CartScene({ fixtures }: { fixtures: TutorialFixtures }) {
	return (
		<CartPageView
			cart={fixtures.cart}
			hasHydrated
			isAuthenticated={false}
			isPending={false}
			mergeBlocked={false}
			mergeBlockedMessage={null}
			onClear={noop}
			onDecrement={noop}
			onDiscardPendingGuestItems={noop}
			onIncrement={noop}
			onLeaveCheckout={noop}
			onQuantityCommit={noop}
			onRemove={noop}
			targets={{
				lines: tutorialTarget("cart-lines"),
				summary: tutorialTarget("cart-summary"),
			}}
			transferDiscountPercent={TUTORIAL_TRANSFER_DISCOUNT_PERCENT}
		/>
	);
}
