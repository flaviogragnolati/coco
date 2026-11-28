"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useIsMobile } from "~/hooks/use-mobile";
import type { CartSnapshot } from "~/shared/common/cart.types";
import { formatCurrency } from "~/shared/common/commerce.helpers";
import { useCartStore } from "~/store/cart-store";
import {
	useCheckoutDraft,
	useCheckoutDraftStore,
} from "~/store/checkout-draft-store";
import { api } from "~/trpc/react";
import { getCheckoutCharge } from "./checkout-charge";
import { DeliverySheet } from "./delivery-sheet";
import {
	finishBlockerMessages,
	finishBlockers,
	resolveFinishSelection,
	toConfirmInput,
} from "./finish-order";
import {
	type FinishAction,
	FinishOrderErrorPanel,
	FinishOrderLoadingPanel,
	FinishOrderMobileBar,
	FinishOrderPanel,
} from "./finish-order-panel";
import { paymentMethodCopy } from "./payment-method-copy";
import { PaymentSheet } from "./payment-sheet";
import { TermsDialog } from "./terms-dialog";
import type { CheckoutOptions } from "./use-checkout-options";

/**
 * The signed-in "Finalizar" panel: reads the options, keeps the customer's
 * picks in the session draft, and confirms (ADR 0015). A transfer lands on the
 * order (`?llegada=nuevo`); Mercado Pago leaves for the provider.
 */
export function FinishOrder({
	userId,
	cart,
	options,
	cartBusy,
	blockedReason,
	onLeaveCheckout,
	leaving,
}: {
	userId: string;
	/** The live cart the screen shows, so totals follow every edit. */
	cart: CartSnapshot;
	options: CheckoutOptions;
	/** A cart edit is still on its way: confirming now could miss it. */
	cartBusy: boolean;
	/** Set when confirming must wait, read next to the button. */
	blockedReason: string | null;
	onLeaveCheckout: () => void;
	leaving: boolean;
}) {
	const router = useRouter();
	const utils = api.useUtils();
	const isMobile = useIsMobile();
	const replaceCart = useCartStore((state) => state.replaceCart);
	const draft = useCheckoutDraft(userId);
	const updateDraft = useCheckoutDraftStore((state) => state.updateDraft);
	const clearDraft = useCheckoutDraftStore((state) => state.clearDraft);
	const [sheet, setSheet] = useState<"delivery" | "payment" | null>(null);
	const [termsOpen, setTermsOpen] = useState(false);
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [idempotencyKey, setIdempotencyKey] = useState(() =>
		crypto.randomUUID(),
	);

	const state = options.state;
	const selection = useMemo(
		() => (state ? resolveFinishSelection(state, draft) : null),
		[draft, state],
	);
	const liveOrder = state?.liveOrder ?? null;
	// The terms of a waiting order were accepted when it was confirmed.
	const termsGiven = liveOrder !== null || acceptedTerms;

	// A repeated key answers with the attempt it created, whatever it was for:
	// a new choice needs a new key, a plain retry keeps the old one.
	const choiceKey = selection
		? [
				selection.deliveryMode,
				selection.address?.id,
				selection.pickupPoint?.id,
				selection.paymentMethod?.id,
			].join(":")
		: "";
	const previousChoice = useRef(choiceKey);
	useEffect(() => {
		if (previousChoice.current === choiceKey) return;
		previousChoice.current = choiceKey;
		setIdempotencyKey(crypto.randomUUID());
	}, [choiceKey]);

	const confirm = api.checkout.confirmAndPay.useMutation({
		async onError(error) {
			toast.error(error.message || "No pudimos confirmar tu pedido");
			// Nothing was created: show the server's figures and let the same key
			// confirm again.
			if (error.data?.code !== "CONFLICT") return;
			const next = await options.refresh();
			if (next) replaceCart(next.cart, userId);
		},
		async onSuccess(output) {
			setIdempotencyKey(crypto.randomUUID());
			clearDraft();
			if (output.redirectUrl) {
				toast.message("Te llevamos a Mercado Pago");
				window.location.assign(output.redirectUrl);
				return;
			}
			try {
				replaceCart(await utils.client.cart.getCurrent.query(), userId);
			} catch {
				// The order page reads the cart again on its own.
			}
			await utils.orders.listMine.invalidate();
			router.push(`/my-orders/${output.order.id}?llegada=nuevo`);
		},
	});

	if (options.failed) return <FinishOrderErrorPanel onRetry={options.retry} />;
	if (!state || !selection) return <FinishOrderLoadingPanel />;

	const total = cart.totals[0];
	if (!total) return null;

	const charge = getCheckoutCharge(
		cart,
		selection.paymentMethod,
		state.transferDiscountPercent,
	);
	const blockers = finishBlockers(selection, { acceptedTerms: termsGiven });
	const method = selection.paymentMethod;
	const keepsTransfer =
		liveOrder !== null &&
		method?.provider === "external" &&
		method.id === liveOrder.paymentMethodId;

	const reason =
		blockedReason ??
		(cartBusy ? "Esperá a que se guarden los cambios de tu pedido." : null) ??
		(blockers[0] ? finishBlockerMessages[blockers[0]] : null);

	const handleConfirm = () => {
		if (keepsTransfer && liveOrder) {
			router.push(`/my-orders/${liveOrder.id}`);
			return;
		}
		if (!charge) return;
		const input = toConfirmInput(selection, {
			acceptedTerms: termsGiven,
			expectedAmount: charge.amount,
			idempotencyKey,
		});
		if (input) confirm.mutate(input);
	};

	const action: FinishAction = {
		label: keepsTransfer
			? "Ver los datos para transferir"
			: method?.provider === "mercadopago"
				? "Pagar en Mercado Pago"
				: liveOrder
					? "Pagar por transferencia"
					: "Confirmar pedido",
		onClick: handleConfirm,
		disabled: reason !== null || (!keepsTransfer && !charge),
		reason,
		pending: confirm.isPending,
	};
	const side = isMobile ? "bottom" : "right";

	return (
		<>
			<FinishOrderPanel
				acceptedTerms={acceptedTerms}
				action={action}
				blockers={blockers}
				charge={charge}
				itemCount={cart.itemCount}
				leaving={leaving}
				liveOrder={liveOrder}
				onAcceptedTermsChange={setAcceptedTerms}
				onLeaveCheckout={onLeaveCheckout}
				onOpenDelivery={() => setSheet("delivery")}
				onOpenPayment={() => setSheet("payment")}
				onOpenTerms={() => setTermsOpen(true)}
				selection={selection}
				total={total}
			/>
			{liveOrder && liveOrder.release !== "release" ? null : (
				<FinishOrderMobileBar
					action={action}
					amount={formatCurrency(
						charge?.amount ?? total.amount,
						total.currency,
					)}
					caption={
						method ? paymentMethodCopy(method).title : "Elegí cómo pagás"
					}
				/>
			)}
			<DeliverySheet
				addresses={state.addresses}
				onModeChange={(deliveryMode) => updateDraft(userId, { deliveryMode })}
				onOpenChange={(open) => setSheet(open ? "delivery" : null)}
				onSaveAddress={options.saveAddress}
				onSelectAddress={(addressId) =>
					updateDraft(userId, { addressId, deliveryMode: "homeDelivery" })
				}
				onSelectPickupPoint={(pickupPointId) =>
					updateDraft(userId, { pickupPointId, deliveryMode: "pickupPoint" })
				}
				open={sheet === "delivery"}
				pickupPoints={state.pickupPoints}
				savingAddress={options.savingAddress}
				selection={selection}
				side={side}
			/>
			<PaymentSheet
				onOpenChange={(open) => setSheet(open ? "payment" : null)}
				onSelect={(paymentMethod) =>
					updateDraft(userId, { provider: paymentMethod.provider })
				}
				open={sheet === "payment"}
				paymentMethods={state.paymentMethods}
				selectedPaymentMethodId={method?.id ?? null}
				side={side}
				total={total}
				transferDiscountPercent={state.transferDiscountPercent}
			/>
			<TermsDialog
				onAccept={() => setAcceptedTerms(true)}
				onOpenChange={setTermsOpen}
				open={termsOpen}
				termsText={state.termsText}
			/>
		</>
	);
}
