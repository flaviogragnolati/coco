import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { CheckoutDeliveryStep } from "~/app/(storefront)/checkout/_components/checkout-delivery-step";
import { CheckoutOrderStep } from "~/app/(storefront)/checkout/_components/checkout-order-step";
import { CheckoutPaymentStep } from "~/app/(storefront)/checkout/_components/checkout-payment-step";
import { CheckoutReviewStep } from "~/app/(storefront)/checkout/_components/checkout-review-step";
import { CheckoutStepper } from "~/app/(storefront)/checkout/_components/checkout-stepper";
import {
	CHECKOUT_STEPS,
	type CheckoutSelection,
	type CheckoutStepId,
	prevStep,
} from "~/app/(storefront)/checkout/_components/checkout-steps";
import {
	CheckoutMobileBar,
	CheckoutSummary,
} from "~/app/(storefront)/checkout/_components/checkout-summary";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import type { TutorialFixtures } from "~/features/tutorial/tutorial-fixtures";
import { TutorialTargetSlot } from "../tutorial-target-slot";
import { noop } from "./noop";

/**
 * The render shell of `CheckoutClient` with every choice already made: home
 * delivery to the example address and Mercado Pago. Mirror that component's
 * layout when it changes (ADR 0012).
 */
export function CheckoutScene({
	step,
	fixtures,
}: {
	step: CheckoutStepId;
	fixtures: TutorialFixtures;
}) {
	const { checkoutState, deliverySelection, paymentMethod } = fixtures;
	const cart = checkoutState.cart;
	const address =
		deliverySelection.mode === "homeDelivery"
			? deliverySelection.address
			: null;
	const selection: CheckoutSelection = {
		hasItems: true,
		deliveryMode: deliverySelection.mode,
		addressId: address?.id ?? null,
		pickupPointId: null,
		paymentMethodId: paymentMethod.id,
		acceptedTerms: true,
	};

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 pb-28 md:px-6 lg:pb-8">
			<PageHeader
				actions={
					<Button tabIndex={-1} type="button" variant="outline">
						<ChevronLeftIcon data-icon="inline-start" />
						Volver a tu pedido
					</Button>
				}
				description="Cuatro pasos para dejar listo tu pedido de la semana."
				eyebrow="Checkout"
				title="Confirmá tu pedido compartido"
			/>

			<TutorialTargetSlot id="checkout-stepper">
				<CheckoutStepper
					currentStep={step}
					onStepChange={noop}
					selection={selection}
					steps={CHECKOUT_STEPS}
				/>
			</TutorialTargetSlot>

			<div className="grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-start">
				<section className="flex flex-col gap-4">
					{step === "order" ? (
						<CheckoutOrderStep
							cart={cart}
							onEditCart={noop}
							transferDiscountPercent={checkoutState.transferDiscountPercent}
						/>
					) : null}

					{step === "delivery" ? (
						<TutorialTargetSlot id="checkout-delivery">
							<CheckoutDeliveryStep
								addresses={checkoutState.addresses}
								deliveryMode={deliverySelection.mode}
								onAddAddress={noop}
								onDeliveryModeChange={noop}
								onEditAddress={noop}
								onSelectAddress={noop}
								onSelectPickupPoint={noop}
								pickupPoints={checkoutState.pickupPoints}
								selectedAddressId={address?.id ?? null}
								selectedPickupPointId={null}
							/>
						</TutorialTargetSlot>
					) : null}

					{step === "payment" ? (
						<TutorialTargetSlot id="checkout-payment">
							<CheckoutPaymentStep
								onSelect={noop}
								paymentMethods={checkoutState.paymentMethods}
								selectedPaymentMethodId={paymentMethod.id}
								total={cart.totals[0]}
								transferDiscountPercent={checkoutState.transferDiscountPercent}
							/>
						</TutorialTargetSlot>
					) : null}

					{step === "review" ? (
						<TutorialTargetSlot id="checkout-review">
							<CheckoutReviewStep
								acceptedTerms
								cart={cart}
								delivery={deliverySelection}
								onAcceptedTermsChange={noop}
								onConfirm={noop}
								onEditStep={noop}
								paymentMethod={paymentMethod}
								termsText={checkoutState.termsText}
								transferDiscountPercent={checkoutState.transferDiscountPercent}
							/>
						</TutorialTargetSlot>
					) : null}

					<div className="hidden justify-between gap-2 lg:flex">
						<Button
							disabled={!prevStep(step)}
							tabIndex={-1}
							type="button"
							variant="outline"
						>
							<ChevronLeftIcon data-icon="inline-start" />
							Atrás
						</Button>
						{step === "review" ? null : (
							<Button tabIndex={-1} type="button">
								Continuar
								<ChevronRightIcon data-icon="inline-end" />
							</Button>
						)}
					</div>
				</section>

				<CheckoutSummary
					cart={cart}
					className="hidden lg:sticky lg:top-20 lg:block"
					currentStep={step}
					delivery={deliverySelection}
					onEditStep={noop}
					selectedPaymentMethod={paymentMethod}
					transferDiscountPercent={checkoutState.transferDiscountPercent}
				/>
			</div>

			<CheckoutMobileBar
				canConfirm
				canContinue
				cart={cart}
				currentStep={step}
				onOpenSummary={noop}
				onPrimary={noop}
				selectedPaymentMethod={paymentMethod}
				transferDiscountPercent={checkoutState.transferDiscountPercent}
			/>
		</main>
	);
}
