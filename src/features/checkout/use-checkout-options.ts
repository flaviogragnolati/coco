"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { canStartCheckout } from "~/features/cart/checkout-start-gate.decision";
import type {
	CheckoutAddress,
	CheckoutAddressCreateInput,
	CheckoutAddressUpdateInput,
	CheckoutState,
} from "~/shared/common/checkout.types";
import { useCartStore } from "~/store/cart-store";
import { api } from "~/trpc/react";

/**
 * What the order page chooses from: addresses, pickup points, payment methods,
 * terms, and the order a frozen cart is waiting on (ADR 0015).
 *
 * The first read is `checkout.start`, which mints the payment methods; it waits
 * for the cart bootstrap like the old checkout screen did. Afterwards the state
 * is read again with `checkout.getState` whenever the cart moves in or out of
 * checkout, so a confirmation, a "Volver a editar el pedido" or an edit that
 * cancels a waiting order show up without a reload.
 */
export function useCheckoutOptions({
	enabled,
	cartStatus,
}: {
	/** Signed in, with products, and the guest items merged. */
	enabled: boolean;
	cartStatus: string | null;
}) {
	const hasHydrated = useCartStore((state) => state.hasHydrated);
	const bootstrapState = useCartStore((state) => state.bootstrapState);
	const [state, setState] = useState<CheckoutState | null>(null);
	const [failed, setFailed] = useState(false);
	const startRequested = useRef(false);
	const seenStatus = useRef(cartStatus);
	const utils = api.useUtils();

	const start = api.checkout.start.useMutation({
		onError(error) {
			setFailed(true);
			toast.error(
				error.message || "No pudimos cargar las opciones de entrega y pago",
			);
		},
		onSuccess(next) {
			setFailed(false);
			seenStatus.current = next.cart.status;
			setState(next);
		},
	});

	useEffect(() => {
		if (!enabled || startRequested.current) return;
		if (!canStartCheckout({ bootstrapState, hasHydrated })) return;

		startRequested.current = true;
		start.mutate();
	}, [bootstrapState, enabled, hasHydrated, start]);

	const refresh = useCallback(async () => {
		try {
			const next = await utils.checkout.getState.fetch(undefined, {
				staleTime: 0,
			});
			seenStatus.current = next.cart.status;
			setState(next);
			return next;
		} catch {
			return null;
		}
	}, [utils]);

	useEffect(() => {
		if (!state || !enabled) return;
		if (seenStatus.current === cartStatus) return;
		seenStatus.current = cartStatus;
		void refresh();
	}, [cartStatus, enabled, refresh, state]);

	const retry = useCallback(() => {
		startRequested.current = true;
		start.mutate();
	}, [start]);

	const keepAddress = useCallback((address: CheckoutAddress) => {
		setState((current) =>
			current
				? {
						...current,
						addresses: [
							address,
							...current.addresses.filter((item) => item.id !== address.id),
						],
					}
				: current,
		);
	}, []);

	const createAddress = api.checkout.createAddress.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo guardar la dirección");
		},
		onSuccess: keepAddress,
	});

	const updateAddress = api.checkout.updateAddress.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo actualizar la dirección");
		},
		onSuccess: keepAddress,
	});

	const saveAddress = useCallback(
		(input: CheckoutAddressCreateInput | CheckoutAddressUpdateInput) =>
			"id" in input
				? updateAddress.mutateAsync(input)
				: createAddress.mutateAsync(input),
		[createAddress, updateAddress],
	);

	return {
		state,
		loading: enabled && !state && !failed,
		failed,
		retry,
		refresh,
		saveAddress,
		savingAddress: createAddress.isPending || updateAddress.isPending,
	};
}

export type CheckoutOptions = ReturnType<typeof useCheckoutOptions>;
