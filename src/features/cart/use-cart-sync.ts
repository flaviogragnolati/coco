"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import type {
	CartAddedLine,
	CartItem,
	CartMutationOutput,
} from "~/shared/common/cart.types";
import {
	getNextQuantity,
	getPreviousQuantity,
	normalizeCartQuantity,
} from "~/shared/common/commerce.helpers";
import type { HomeComboOption } from "~/shared/common/home.types";
import { selectCartSnapshot, useCartStore } from "~/store/cart-store";
import { api } from "~/trpc/react";
import { decideCartBootstrap } from "./cart-bootstrap.decision";
import {
	describeLocalCartAdditions,
	homeOfferToCartItem,
} from "./cart-mappers";
import { describeRepeatOutcome } from "./repeat-order.messages";
import { useCartStorageSync } from "./use-cart-storage-sync";

type UseCartSyncOptions = {
	isAuthenticated: boolean;
	userId?: string | null;
};

function notifyWarnings(output: CartMutationOutput) {
	for (const warning of output.warnings) {
		toast.warning(warning.message);
	}
}

function notifyAddOutcome(lines: Pick<CartAddedLine, "name" | "outcome">[]) {
	const messages = describeRepeatOutcome(lines);
	if (messages.success) toast.success(messages.success);
	for (const message of messages.info) toast.info(message);
	for (const message of messages.warning) toast.warning(message);
}

export function useCartSync({ isAuthenticated, userId }: UseCartSyncOptions) {
	useCartStorageSync(userId ?? null);

	const hasHydrated = useCartStore((state) => state.hasHydrated);
	const items = useCartStore((state) => state.items);
	const serverCartId = useCartStore((state) => state.serverCartId);
	const syncedUserId = useCartStore((state) => state.syncedUserId);
	const replaceCart = useCartStore((state) => state.replaceCart);
	const detachServerCart = useCartStore((state) => state.detachServerCart);
	const resetForNewSession = useCartStore((state) => state.resetForNewSession);
	const setBootstrapState = useCartStore((state) => state.setBootstrapState);
	const bootstrapCompleted = useRef(false);
	const utils = api.useUtils();

	const currentCartQuery = api.cart.getCurrent.useQuery(undefined, {
		enabled: false,
	});

	const syncMutation = api.cart.syncLocal.useMutation({
		// Every error must settle the bootstrap: leaving it unfinished would hang
		// every screen gated on it.
		onError(error) {
			const message = error.message || "No se pudo sincronizar tu pedido";
			toast.error(message);

			if (error.data?.code === "PRECONDITION_FAILED") {
				setBootstrapState("blocked", message);
				return;
			}
			setBootstrapState("done");
		},
		onSuccess(output) {
			replaceCart(output.cart, userId ?? null);
			notifyWarnings(output);
			setBootstrapState("done");
		},
	});

	useEffect(() => {
		if (!hasHydrated) return;

		if (!isAuthenticated || !userId) {
			bootstrapCompleted.current = false;
			setBootstrapState("idle");

			// Fires however the session ended - expiry, cleared cookie, sign-out in
			// another tab - so an attributed cart cannot outlive its owner here.
			if (syncedUserId !== null) {
				resetForNewSession();
			} else {
				detachServerCart();
			}
			return;
		}

		if (bootstrapCompleted.current) return;
		bootstrapCompleted.current = true;
		setBootstrapState("running");

		const decision = decideCartBootstrap({
			itemCount: Object.keys(items).length,
			serverCartId,
			syncedUserId,
			userId,
		});

		if (decision === "merge") {
			syncMutation.mutate({
				items: Object.values(items).map((item) => ({
					productClientTermsId: item.productClientTermsId,
					quantity: item.quantity,
				})),
			});
			return;
		}

		if (decision === "discard") {
			resetForNewSession();
		}

		void currentCartQuery
			.refetch()
			.then((result) => {
				if (result.data) replaceCart(result.data, userId);
			})
			// Same reason as the merge path: settled, not successful.
			.finally(() => setBootstrapState("done"));
	}, [
		currentCartQuery,
		detachServerCart,
		hasHydrated,
		isAuthenticated,
		items,
		replaceCart,
		resetForNewSession,
		serverCartId,
		setBootstrapState,
		syncMutation,
		syncedUserId,
		userId,
	]);

	const invalidateServerCart = useCallback(async () => {
		await utils.cart.getCurrent.invalidate();
	}, [utils]);

	const needsBootstrap =
		hasHydrated &&
		isAuthenticated &&
		Boolean(userId) &&
		!bootstrapCompleted.current;

	return {
		hasHydrated,
		isSyncing:
			needsBootstrap || syncMutation.isPending || currentCartQuery.isFetching,
		invalidateServerCart,
	};
}

export function useCartActions({
	isAuthenticated,
	userId,
}: UseCartSyncOptions) {
	const upsertItem = useCartStore((state) => state.upsertItem);
	const addLocalItems = useCartStore((state) => state.addItems);
	const setLocalItemQuantity = useCartStore((state) => state.setItemQuantity);
	const removeLocalItem = useCartStore((state) => state.removeItem);
	const clearLocalCart = useCartStore((state) => state.clear);
	const replaceCart = useCartStore((state) => state.replaceCart);
	const items = useCartStore((state) => state.items);
	const serverCartCode = useCartStore((state) => state.serverCartCode);
	const serverCartId = useCartStore((state) => state.serverCartId);
	const serverCartStatus = useCartStore((state) => state.serverCartStatus);
	const cart = useMemo(
		() =>
			selectCartSnapshot({
				items,
				serverCartCode,
				serverCartId,
				serverCartStatus,
			}),
		[items, serverCartCode, serverCartId, serverCartStatus],
	);

	const utils = api.useUtils();

	const applyOutput = useCallback(
		(output: CartMutationOutput) => {
			replaceCart(output.cart, userId ?? null);
			notifyWarnings(output);
		},
		[replaceCart, userId],
	);

	// The store already shows the refused change, for instance while a payment
	// holds the order; read the order back so the screen matches it again.
	const restoreServerCart = useCallback(() => {
		void utils.client.cart.getCurrent
			.query()
			.then((snapshot) => replaceCart(snapshot, userId ?? null))
			.catch(() => undefined);
	}, [replaceCart, userId, utils]);

	const setItemMutation = api.cart.setItemQuantity.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo actualizar tu pedido");
			restoreServerCart();
		},
		onSuccess: applyOutput,
	});

	const removeMutation = api.cart.removeItem.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo quitar el producto");
			restoreServerCart();
		},
		onSuccess: applyOutput,
	});

	const clearMutation = api.cart.clear.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo vaciar tu pedido");
		},
		onSuccess(output) {
			applyOutput(output);
			toast.success("Pedido vaciado");
		},
	});

	const leaveCheckoutMutation = api.checkout.leave.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo volver a editar tu pedido");
		},
		onSuccess(snapshot) {
			replaceCart(snapshot, userId ?? null);
			toast.success("Cerramos el checkout. Ya podés editar tu pedido.");
		},
	});

	const addComboMutation = api.cart.addCombo.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo sumar el combo");
		},
		onSuccess(output) {
			replaceCart(output.cart, userId ?? null);
			notifyAddOutcome(output.lines);
		},
	});

	const isPending =
		setItemMutation.isPending ||
		removeMutation.isPending ||
		clearMutation.isPending ||
		leaveCheckoutMutation.isPending ||
		addComboMutation.isPending;

	const setItem = useCallback(
		(item: CartItem) => {
			upsertItem(item);

			if (!isAuthenticated || !userId) {
				toast.success("Producto agregado a tu pedido");
				return;
			}

			setItemMutation.mutate({
				productClientTermsId: item.productClientTermsId,
				quantity: item.quantity,
			});
		},
		[isAuthenticated, setItemMutation, upsertItem, userId],
	);

	/**
	 * Adds every available product of the combo as its own line, on top of what
	 * the order holds. With a session the server reads the combo and today's
	 * terms; a guest adds what the card showed.
	 */
	const addCombo = useCallback(
		(option: HomeComboOption) => {
			if (isAuthenticated && userId) {
				addComboMutation.mutate({ comboId: option.comboId });
				return;
			}

			const incoming = option.items.map((item) =>
				homeOfferToCartItem(item.offer, item.quantity),
			);
			const outcomes = describeLocalCartAdditions(
				useCartStore.getState().items,
				incoming,
			);
			addLocalItems(incoming);
			notifyAddOutcome([
				...outcomes,
				...option.unavailableNames.map((name) => ({
					name,
					outcome: "unavailable" as const,
				})),
			]);
		},
		[addComboMutation, addLocalItems, isAuthenticated, userId],
	);

	const updateQuantity = useCallback(
		(item: CartItem, quantity: string) => {
			const normalizedQuantity = normalizeCartQuantity(quantity, item.terms);
			setLocalItemQuantity(item.productClientTermsId, normalizedQuantity);

			if (!isAuthenticated || !userId) return;

			setItemMutation.mutate({
				productClientTermsId: item.productClientTermsId,
				quantity: normalizedQuantity,
			});
		},
		[isAuthenticated, setItemMutation, setLocalItemQuantity, userId],
	);

	const increment = useCallback(
		(item: CartItem) =>
			updateQuantity(item, getNextQuantity(item.quantity, item.terms)),
		[updateQuantity],
	);

	const decrement = useCallback(
		(item: CartItem) =>
			updateQuantity(item, getPreviousQuantity(item.quantity, item.terms)),
		[updateQuantity],
	);

	const removeItem = useCallback(
		(productClientTermsId: number) => {
			removeLocalItem(productClientTermsId);

			if (!isAuthenticated || !userId) {
				toast.info("Producto quitado de tu pedido");
				return;
			}

			removeMutation.mutate({ productClientTermsId });
		},
		[isAuthenticated, removeLocalItem, removeMutation, userId],
	);

	const clear = useCallback(() => {
		clearLocalCart();

		if (!isAuthenticated || !userId) {
			toast.info("Pedido vaciado");
			return;
		}

		clearMutation.mutate();
	}, [clearLocalCart, clearMutation, isAuthenticated, userId]);

	const leaveCheckout = useCallback(() => {
		if (!isAuthenticated || !userId) return;

		leaveCheckoutMutation.mutate();
	}, [isAuthenticated, leaveCheckoutMutation, userId]);

	return useMemo(
		() => ({
			addCombo,
			cart,
			clear,
			decrement,
			increment,
			isPending,
			leaveCheckout,
			removeItem,
			setItem,
			updateQuantity,
		}),
		[
			addCombo,
			cart,
			clear,
			decrement,
			increment,
			isPending,
			leaveCheckout,
			removeItem,
			setItem,
			updateQuantity,
		],
	);
}
