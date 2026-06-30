"use client";

import { create } from "zustand";

type CartUiState = {
	isMiniCartOpen: boolean;
	openMiniCart: () => void;
	closeMiniCart: () => void;
	setMiniCartOpen: (open: boolean) => void;
};

/**
 * Ephemeral, non-persisted UI state for the mini-cart slide-over. Kept
 * separate from the persisted cart store so the open state never survives
 * reloads.
 */
export const useCartUiStore = create<CartUiState>()((set) => ({
	isMiniCartOpen: false,
	openMiniCart: () => set({ isMiniCartOpen: true }),
	closeMiniCart: () => set({ isMiniCartOpen: false }),
	setMiniCartOpen: (open) => set({ isMiniCartOpen: open }),
}));
