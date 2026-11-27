import { CartPageView } from "~/app/(storefront)/cart/_components/cart-page-view";
import { FinishOrderGuestPanel } from "~/features/checkout/finish-order-panel";
import {
	TUTORIAL_TRANSFER_DISCOUNT_PERCENT,
	type TutorialFixtures,
} from "~/features/tutorial/tutorial-fixtures";
import { tutorialTarget } from "~/features/tutorial/tutorial-script";
import { noop } from "./noop";

/** As a guest: the walk-through signs in at checkout, like most customers do. */
export function CartScene({ fixtures }: { fixtures: TutorialFixtures }) {
	const total = fixtures.cart.totals[0];

	return (
		<CartPageView
			cart={fixtures.cart}
			finishSlot={
				total ? (
					<FinishOrderGuestPanel
						itemCount={fixtures.cart.itemCount}
						total={total}
						transferDiscountPercent={TUTORIAL_TRANSFER_DISCOUNT_PERCENT}
					/>
				) : null
			}
			hasHydrated
			isPending={false}
			locked={false}
			mergeBlocked={false}
			mergeBlockedMessage={null}
			onClear={noop}
			onDecrement={noop}
			onDiscardPendingGuestItems={noop}
			onIncrement={noop}
			onQuantityCommit={noop}
			onRemove={noop}
			targets={{
				lines: tutorialTarget("cart-lines"),
				summary: tutorialTarget("cart-summary"),
			}}
		/>
	);
}
