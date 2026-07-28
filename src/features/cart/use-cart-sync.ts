"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import type { CartItem, CartMutationOutput } from "~/shared/common/cart.types";
import {
	getNextQuantity,
	getPreviousQuantity,
	normalizeCartQuantity,
} from "~/shared/common/commerce.helpers";
import { selectCartSnapshot, useCartStore } from "~/store/cart-store";
import { api } from "~/trpc/react";
import { decideCartBootstrap } from "./cart-bootstrap.decision";
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

export function useCartSync({ isAuthenticated, userId }: UseCartSyncOptions) {
	useCartStorageSync(userId ?? null);

	const hasHydrated = useCartStore((state) => state.hasHydrated);
	const items = useCartStore((state) => state.items);
	const serverCartId = useCartStore((state) => state.serverCartId);
	const syncedUserId = useCartStore((state) => state.syncedUserId);
	const replaceCart = useCartStore((state) => state.replaceCart);
	const detachServerCart = useCartStore((state) => state.detachServerCart);
	const resetForNewSession = useCartStore((state) => state.resetForNewSession);
	const bootstrapCompleted = useRef(false);
	const utils = api.useUtils();

	const currentCartQuery = api.cart.getCurrent.useQuery(undefined, {
		enabled: false,
	});

	const syncMutation = api.cart.syncLocal.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo sincronizar el carrito");
		},
		onSuccess(output) {
			replaceCart(output.cart, userId ?? null);
			notifyWarnings(output);
		},
	});

	useEffect(() => {
		if (!hasHydrated) return;

		if (!isAuthenticated || !userId) {
			bootstrapCompleted.current = false;

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

		void currentCartQuery.refetch().then((result) => {
			if (result.data) replaceCart(result.data, userId);
		});
	}, [
		currentCartQuery,
		detachServerCart,
		hasHydrated,
		isAuthenticated,
		items,
		replaceCart,
		resetForNewSession,
		serverCartId,
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

	const applyOutput = useCallback(
		(output: CartMutationOutput) => {
			replaceCart(output.cart, userId ?? null);
			notifyWarnings(output);
		},
		[replaceCart, userId],
	);

	const setItemMutation = api.cart.setItemQuantity.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo actualizar el carrito");
		},
		onSuccess: applyOutput,
	});

	const removeMutation = api.cart.removeItem.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo quitar el producto");
		},
		onSuccess: applyOutput,
	});

	const clearMutation = api.cart.clear.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo vaciar el carrito");
		},
		onSuccess(output) {
			applyOutput(output);
			toast.success("Carrito vaciado");
		},
	});

	const leaveCheckoutMutation = api.checkout.leave.useMutation({
		onError(error) {
			toast.error(error.message || "No se pudo volver a editar el carrito");
		},
		onSuccess(snapshot) {
			replaceCart(snapshot, userId ?? null);
			toast.success("Cerramos el checkout. Ya podés editar el carrito.");
		},
	});

	const isPending =
		setItemMutation.isPending ||
		removeMutation.isPending ||
		clearMutation.isPending ||
		leaveCheckoutMutation.isPending;

	const setItem = useCallback(
		(item: CartItem) => {
			upsertItem(item);

			if (!isAuthenticated || !userId) {
				toast.success("Producto agregado al carrito");
				return;
			}

			setItemMutation.mutate({
				productClientTermsId: item.productClientTermsId,
				quantity: item.quantity,
			});
		},
		[isAuthenticated, setItemMutation, upsertItem, userId],
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
				toast.info("Producto quitado del carrito");
				return;
			}

			removeMutation.mutate({ productClientTermsId });
		},
		[isAuthenticated, removeLocalItem, removeMutation, userId],
	);

	const clear = useCallback(() => {
		clearLocalCart();

		if (!isAuthenticated || !userId) {
			toast.info("Carrito vaciado");
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
