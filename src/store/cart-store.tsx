"use client";

import { useMemo, type ReactNode } from "react";

import { useAppStore } from "./StoreProvider";
import type { CartLine } from "./slices/cart.slice";
export { getDefaultQuantity } from "./slices/cart.slice";
import type { ProductWithCategory } from "~/types/product";

type UseCartResult = {
  items: CartLine[];
  totalItems: number;
  totalAmount: number;
  addItem: (product: ProductWithCategory, quantity?: number) => void;
  incrementItem: (productId: number, step?: number) => void;
  decrementItem: (productId: number, step?: number) => void;
  setItemQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
};

export type CartItem = CartLine;

export function CartProvider({ children }: { children: ReactNode }) {
  // Kept for compatibility with existing usage; StoreProvider already initializes the store.
  return <>{children}</>;
}

export function useCart(): UseCartResult {
  const items = useAppStore((state) => state.cartLines);
  const addItem = useAppStore((state) => state.addItem);
  const incrementItem = useAppStore((state) => state.incrementItem);
  const decrementItem = useAppStore((state) => state.decrementItem);
  const setItemQuantity = useAppStore((state) => state.setItemQuantity);
  const removeItem = useAppStore((state) => state.removeItem);
  const clearCart = useAppStore((state) => state.clearCart);

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items],
  );

  const totalAmount = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + item.quantity * (item.product.price ?? 0),
        0,
      ),
    [items],
  );

  return {
    items,
    totalItems,
    totalAmount,
    addItem,
    incrementItem,
    decrementItem,
    setItemQuantity,
    removeItem,
    clearCart,
  };
}
