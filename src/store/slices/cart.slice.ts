import _ from "lodash";
import type { StateCreator } from "zustand";

import type { RootState } from "./root";
import type { Product, ProductWithCategory } from "~/types/product";

export type CartLine = { product: ProductWithCategory; quantity: number };

export interface CartState {
  cartLines: CartLine[];
}

export interface CartActions {
  addItem: (product: ProductWithCategory, quantity?: number) => void;
  incrementItem: (productId: number, step?: number) => void;
  decrementItem: (productId: number, step?: number) => void;
  setItemQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
}

export type CartSliceState = CartState & CartActions;

export const defaultInitialState: CartState = {
  cartLines: [],
};

export const getDefaultQuantity = (product: Product): number => {
  const base = product.customerMoq ?? 1;
  const minFraction = product.minFractionPerUser ?? 1;
  return Math.max(base, minFraction);
};

const resolveQuantity = (
  product: ProductWithCategory,
  quantity?: number,
): number => {
  if (quantity && quantity > 0) return quantity;
  return getDefaultQuantity(product);
};

export const createCartSlice: (
  initState?: Partial<CartState>,
) => StateCreator<
  RootState,
  [
    ["zustand/persist", unknown],
    ["zustand/devtools", never],
    ["zustand/immer", never],
  ],
  [],
  CartSliceState
> = (initState) => {
  const initialState = _.merge({}, defaultInitialState, initState);

  return (set, get) => ({
    ...initialState,
    addItem: (product, quantity) =>
      set(
        (draft) => {
          const qtyToAdd = resolveQuantity(product, quantity);
          const existing = draft.cartLines.find(
            (item) => item.product.id === product.id,
          );

          if (existing) {
            existing.quantity += qtyToAdd;
          } else {
            draft.cartLines.push({ product, quantity: qtyToAdd });
          }
        },
        false,
        "cart/addItem",
      ),

    incrementItem: (productId, step = 1) =>
      set(
        (draft) => {
          const line = draft.cartLines.find(
            (item) => item.product.id === productId,
          );
          if (!line) return;
          line.quantity += step;
        },
        false,
        "cart/incrementItem",
      ),

    decrementItem: (productId, step = 1) =>
      set(
        (draft) => {
          const index = draft.cartLines.findIndex(
            (item) => item.product.id === productId,
          );
          if (index === -1) return;

          const line = draft.cartLines[index];
          if (!line) return;

          line.quantity -= step;
          if (line.quantity <= 0) {
            draft.cartLines.splice(index, 1);
          }
        },
        false,
        "cart/decrementItem",
      ),

    setItemQuantity: (productId, quantity) =>
      set(
        (draft) => {
          const index = draft.cartLines.findIndex(
            (item) => item.product.id === productId,
          );
          if (index === -1) return;

          if (quantity <= 0) {
            draft.cartLines.splice(index, 1);
            return;
          }

          const line = draft.cartLines[index];
          if (line) {
            line.quantity = quantity;
          }
        },
        false,
        "cart/setItemQuantity",
      ),

    removeItem: (productId) =>
      set(
        (draft) => {
          draft.cartLines = draft.cartLines.filter(
            (item) => item.product.id !== productId,
          );
        },
        false,
        "cart/removeItem",
      ),

    clearCart: () =>
      set(
        (draft) => {
          draft.cartLines = [];
        },
        false,
        "cart/clearCart",
      ),
  });
};
