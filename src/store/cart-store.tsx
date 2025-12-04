"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Product, ProductWithCategory } from "~/types/product";

export type CartItem = { product: ProductWithCategory; quantity: number };

export const CART_STORAGE_KEY = "wholesale-cart-v1";

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  addItem: (product: ProductWithCategory, quantity?: number) => void;
  updateItemQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function getDefaultQuantity(product: Product): number {
  const base = product.customerMoq ?? 1;
  const minFraction = product.minFractionPerUser ?? 1;
  return Math.max(base, minFraction);
}

function readCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readCartFromStorage());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Swallow write errors to avoid breaking the UI.
    }
  }, [items]);

  const addItem = useCallback(
    (product: ProductWithCategory, quantity?: number) => {
      setItems((prev) => {
        const existing = prev.find(
          (item) => item.product.id === product.id,
        );
        const qtyToAdd =
          quantity && quantity > 0 ? quantity : getDefaultQuantity(product);

        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + qtyToAdd }
              : item,
          );
        }

        return [...prev, { product, quantity: qtyToAdd }];
      });
    },
    [],
  );

  const updateItemQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }

      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      );
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

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

  const value: CartContextValue = {
    items,
    totalItems,
    totalAmount,
    addItem,
    updateItemQuantity,
    removeItem,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
