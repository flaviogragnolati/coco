"use client";

import { useEffect } from "react";

import { CART_STORAGE_KEY, useCartStore } from "~/store/cart-store";

export function useCartStorageSync() {
	useEffect(() => {
		const handleStorage = (event: StorageEvent) => {
			if (event.key !== CART_STORAGE_KEY) return;
			void useCartStore.persist.rehydrate();
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);
}
