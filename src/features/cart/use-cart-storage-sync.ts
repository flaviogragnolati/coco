"use client";

import { useEffect } from "react";

import { CART_STORAGE_KEY, useCartStore } from "~/store/cart-store";

export function useCartStorageSync(userId: string | null) {
	useEffect(() => {
		const handleStorage = (event: StorageEvent) => {
			if (event.key !== CART_STORAGE_KEY) return;

			// rehydrate() may be async, and the store still holds pre-rehydration
			// values until it settles - a stale tab must not repopulate this one.
			void Promise.resolve(useCartStore.persist.rehydrate()).then(() => {
				const state = useCartStore.getState();
				if (state.syncedUserId !== null && state.syncedUserId !== userId) {
					state.resetForNewSession();
				}
			});
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, [userId]);
}
