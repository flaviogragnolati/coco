"use client";

import { useStore } from "zustand";
import {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createAppStore,
  type AppStoreApi,
  type AppStoreWithPersist,
  type RootInitialState,
  type RootState,
} from "./store";

export const AppStoreContext = createContext<AppStoreApi | undefined>(
  undefined,
);
export type StoreProviderProps = PropsWithChildren<RootInitialState>;

export default function StoreProvider({
  children,
  ...initialState
}: StoreProviderProps) {
  const storeRef = useRef<AppStoreApi>(undefined);
  const [hasHydrated, setHasHydrated] = useState(false);

  if (!storeRef.current) {
    storeRef.current = createAppStore(initialState);
  }

  useEffect(() => {
    if (!hasHydrated && storeRef.current) {
      const store = storeRef.current as AppStoreWithPersist;
      store.persist.onFinishHydration(() => {
        setHasHydrated(true);
      });

      store.persist.rehydrate();
    }
  }, [hasHydrated]);

  return (
    <AppStoreContext.Provider value={storeRef.current}>
      {hasHydrated ? children : null}
    </AppStoreContext.Provider>
  );
}

export const useAppStore = <T,>(selector: (store: RootState) => T): T => {
  const appStoreContext = useContext(AppStoreContext);
  if (!appStoreContext) {
    throw new Error("useAppStore must be used within a StoreProvider");
  }
  return useStore(appStoreContext, selector);
};
