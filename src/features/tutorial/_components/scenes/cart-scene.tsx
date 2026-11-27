import { CartPageView } from "~/app/(storefront)/cart/_components/cart-page-view";
import { getCheckoutCharge } from "~/features/checkout/checkout-charge";
import { DeliverySheet } from "~/features/checkout/delivery-sheet";
import {
	EMPTY_FINISH_DRAFT,
	finishBlockers,
	resolveFinishSelection,
} from "~/features/checkout/finish-order";
import {
	FinishOrderGuestPanel,
	FinishOrderPanel,
} from "~/features/checkout/finish-order-panel";
import { PaymentSheet } from "~/features/checkout/payment-sheet";
import {
	TUTORIAL_TRANSFER_DISCOUNT_PERCENT,
	type TutorialFixtures,
} from "~/features/tutorial/tutorial-fixtures";
import { tutorialTarget } from "~/features/tutorial/tutorial-script";
import { useIsMobile } from "~/hooks/use-mobile";
import { BELOW_TUTORIAL_BAR } from "../tutorial-mode-bar";
import { noop } from "./noop";

const rejectSave = () => Promise.reject(new Error("Tutorial"));

/**
 * The order page. As a guest it shows the total and the sign-in; signed in, the
 * "Finalizar" panel with home delivery and Mercado Pago already chosen and, on
 * the delivery and payment steps, that sheet open. Mirror `CartClient` and
 * `FinishOrder` when they change (ADR 0012).
 */
export function CartScene({
	fixtures,
	signedIn,
	sheet,
}: {
	fixtures: TutorialFixtures;
	signedIn: boolean;
	sheet: "delivery" | "payment" | null;
}) {
	const isMobile = useIsMobile();
	const state = fixtures.checkoutState;
	const cart = signedIn ? state.cart : fixtures.cart;
	const total = cart.totals[0];
	const selection = resolveFinishSelection(state, EMPTY_FINISH_DRAFT);
	const charge = getCheckoutCharge(
		state.cart,
		selection.paymentMethod,
		state.transferDiscountPercent,
	);
	const side = isMobile ? "bottom" : "right";
	// A side sheet starts below the tutorial bar; a bottom sheet never reaches it.
	const sheetClassName = side === "right" ? BELOW_TUTORIAL_BAR : undefined;

	const finishSlot = !total ? null : !signedIn ? (
		<FinishOrderGuestPanel
			itemCount={cart.itemCount}
			total={total}
			transferDiscountPercent={TUTORIAL_TRANSFER_DISCOUNT_PERCENT}
		/>
	) : (
		<>
			<FinishOrderPanel
				acceptedTerms
				action={{
					label: "Pagar en Mercado Pago",
					onClick: noop,
					disabled: false,
					reason: null,
					pending: false,
				}}
				blockers={finishBlockers(selection, { acceptedTerms: true })}
				charge={charge}
				confirmTarget={tutorialTarget("finish-confirm")}
				itemCount={cart.itemCount}
				liveOrder={null}
				onAcceptedTermsChange={noop}
				onOpenDelivery={noop}
				onOpenPayment={noop}
				onOpenTerms={noop}
				selection={selection}
				total={total}
			/>
			<DeliverySheet
				addresses={state.addresses}
				className={sheetClassName}
				inert
				modal={false}
				onModeChange={noop}
				onOpenChange={noop}
				onSaveAddress={rejectSave}
				onSelectAddress={noop}
				onSelectPickupPoint={noop}
				open={sheet === "delivery"}
				pickupPoints={state.pickupPoints}
				savingAddress={false}
				selection={selection}
				side={side}
				targets={{ content: tutorialTarget("finish-delivery") }}
			/>
			<PaymentSheet
				className={sheetClassName}
				inert
				modal={false}
				onOpenChange={noop}
				onSelect={noop}
				open={sheet === "payment"}
				paymentMethods={state.paymentMethods}
				selectedPaymentMethodId={selection.paymentMethod?.id ?? null}
				side={side}
				targets={{ content: tutorialTarget("finish-payment") }}
				total={total}
				transferDiscountPercent={state.transferDiscountPercent}
			/>
		</>
	);

	return (
		<CartPageView
			cart={cart}
			finishSlot={finishSlot}
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
				summary: tutorialTarget(signedIn ? "cart-finish" : "cart-summary"),
			}}
		/>
	);
}
