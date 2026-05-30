"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
	CartItem,
	CartSnapshot,
	CartStatus,
} from "~/shared/common/cart.types";
import {
	calculateLineTotal,
	toMoneyString,
	toNumber,
	toQuantityString,
} from "~/shared/common/commerce.helpers";

export const CART_STORAGE_KEY = "coco.cart.v1";

type PersistedCartState = {
	items: Record<string, CartItem>;
	serverCartCode: string | null;
	serverCartId: number | null;
	serverCartStatus: CartStatus | null;
	syncedUserId: string | null;
};

export type CartSnapshotSource = {
	items: Record<string, CartItem>;
	serverCartCode: string | null;
	serverCartId: number | null;
	serverCartStatus: CartStatus | null;
};

type CartStoreState = PersistedCartState & {
	hasHydrated: boolean;
	clear: () => void;
	detachServerCart: () => void;
	removeItem: (productClientTermsId: number) => void;
	replaceCart: (cart: CartSnapshot, userId?: string | null) => void;
	setHasHydrated: (hasHydrated: boolean) => void;
	setItemQuantity: (productClientTermsId: number, quantity: string) => void;
	upsertItem: (item: CartItem) => void;
};

function itemKey(productClientTermsId: number) {
	return String(productClientTermsId);
}

const emptyPersistedState: PersistedCartState = {
	items: {},
	serverCartCode: null,
	serverCartId: null,
	serverCartStatus: null,
	syncedUserId: null,
};

export function selectCartSnapshot(state: CartSnapshotSource): CartSnapshot {
	const items = Object.values(state.items).sort((left, right) =>
		left.product.name.localeCompare(right.product.name, "es"),
	);
	const totalsByCurrency = new Map<string, number>();
	let totalQuantity = 0;

	for (const item of items) {
		totalQuantity += toNumber(item.quantity) ?? 0;
		totalsByCurrency.set(
			item.terms.currency,
			(totalsByCurrency.get(item.terms.currency) ?? 0) +
				(toNumber(item.lineTotal) ?? 0),
		);
	}

	return {
		id: state.serverCartId,
		code: state.serverCartCode,
		status: state.serverCartStatus,
		items,
		itemCount: items.length,
		totalQuantity: toQuantityString(totalQuantity),
		totals: Array.from(totalsByCurrency.entries()).map(
			([currency, amount]) => ({
				currency: currency as CartSnapshot["totals"][number]["currency"],
				amount: toMoneyString(amount),
			}),
		),
	};
}

export const useCartStore = create<CartStoreState>()(
	persist(
		(set) => ({
			...emptyPersistedState,
			hasHydrated: false,
			clear: () =>
				set((state) => ({
					...emptyPersistedState,
					syncedUserId: state.syncedUserId,
				})),
			detachServerCart: () =>
				set({
					serverCartCode: null,
					serverCartId: null,
					serverCartStatus: null,
					syncedUserId: null,
				}),
			removeItem: (productClientTermsId) =>
				set((state) => {
					const nextItems = { ...state.items };
					delete nextItems[itemKey(productClientTermsId)];
					return { items: nextItems };
				}),
			replaceCart: (cart, userId = null) =>
				set({
					items: Object.fromEntries(
						cart.items.map((item) => [
							itemKey(item.productClientTermsId),
							item,
						]),
					),
					serverCartCode: cart.code,
					serverCartId: cart.id,
					serverCartStatus: cart.status,
					syncedUserId: userId,
				}),
			setHasHydrated: (hasHydrated) => set({ hasHydrated }),
			setItemQuantity: (productClientTermsId, quantity) =>
				set((state) => {
					const current = state.items[itemKey(productClientTermsId)];
					if (!current) return {};

					return {
						items: {
							...state.items,
							[itemKey(productClientTermsId)]: {
								...current,
								quantity,
								lineTotal: calculateLineTotal(current.terms, quantity),
							},
						},
					};
				}),
			upsertItem: (item) =>
				set((state) => ({
					items: {
						...state.items,
						[itemKey(item.productClientTermsId)]: item,
					},
				})),
		}),
		{
			name: CART_STORAGE_KEY,
			onRehydrateStorage: () => (state) => {
				state?.setHasHydrated(true);
			},
			partialize: (state): PersistedCartState => ({
				items: state.items,
				serverCartCode: state.serverCartCode,
				serverCartId: state.serverCartId,
				serverCartStatus: state.serverCartStatus,
				syncedUserId: state.syncedUserId,
			}),
			storage: createJSONStorage(() => localStorage),
			version: 1,
		},
	),
);
