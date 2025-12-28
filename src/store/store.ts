import { merge } from "lodash";
import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";
import { persist, devtools, createJSONStorage } from "zustand/middleware";

import type {
  RootState as RootStateT,
  RootInitialState as RootInitialStateT,
} from "./slices/root";

import { env } from "~/env";
import { createMainSlice } from "./slices/main.slice";
import { createAuthSlice } from "./slices/auth.slice";
import { createCollabSlice } from "./slices/collab.slice";
import { createModalSlice } from "./slices/modal.slice";
import { createCartSlice } from "./slices/cart.slice";
import { createCheckoutSlice } from "./slices/checkout.slice";

const devtoolsOptions = { enabled: env.NEXT_PUBLIC_ENV !== "production" };
const storeName = env.NEXT_PUBLIC_ENV === "production" ? "coco" : "coco-dev";

export const createAppStore = (initState?: RootInitialStateT) =>
  createStore<RootStateT>()(
    persist(
      devtools(
        immer((...args) => {
          return {
            ...createMainSlice(initState)(...args),
            ...createAuthSlice(initState)(...args),
            ...createCollabSlice(initState)(...args),
            ...createModalSlice(initState)(...args),
            ...createCartSlice(initState)(...args),
            ...createCheckoutSlice(initState)(...args),
          };
        }),
        devtoolsOptions,
      ),
      {
        name: storeName,
        version: 1,
        storage: createJSONStorage(() => localStorage),
        merge: (persistedState, currentState) => {
          return merge({}, persistedState, currentState);
        },
        skipHydration: true,
        partialize: (state) => {
          // Exclude transient UI state from persistence
          const { filters, checkout, ...rest } = state;
          const sanitizedCheckout = checkout
            ? {
                ...checkout,
                paymentDetails: {
                  ...checkout.paymentDetails,
                  cardNumber: "",
                  cvc: "",
                },
              }
            : undefined;

          return {
            ...rest,
            ...(sanitizedCheckout ? { checkout: sanitizedCheckout } : {}),
          };
        },
        onRehydrateStorage: (state) => {
          return (state, error) => {
            if (error) {
              console.debug("an error happened during hydration", error);
            } else {
              state?.setHasHydrated(true);
            }
          };
        },
      },
    ),
  );

export type RootState = RootStateT;
export type RootInitialState = RootInitialStateT;

export type AppStoreApi = ReturnType<typeof createAppStore>;

export type AppStoreWithPersist = AppStoreApi & {
  persist: {
    rehydrate: () => void;
    hasHydrated: () => boolean;
    onFinishHydration: (callback: (state: RootState) => void) => void;
  };
};

export * from "./StoreProvider";
