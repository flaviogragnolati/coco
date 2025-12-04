import _ from "lodash";
import type { StateCreator } from "zustand";

import type { RootState } from "./root";

export interface MainState {
  _hasHydrated: boolean;
}

export interface MainActions {
  setHasHydrated: (value: boolean) => void;
}

export type MainSliceState = MainState & MainActions;

export const defaultInitialState: MainState = {
  _hasHydrated: false,
};

/**
 *
 * Factory function that creates the auth slice with the initial state
 * and the actions that can be performed on the slice.
 * @param initState: The initial state of the auth slice
 * StateCreator is a generic type that takes 4 parameters
 * @param RootState: The combined state of all slices
 * @param StoreMutatorsIdentifiers: An array of middlewares type definitions
 * @param NotUsed: Should be an empty array
 * @param AuthSliceState: The state of the auth slice
 */
export const createMainSlice: (
  initState?: Partial<MainState>,
) => StateCreator<
  RootState,
  [
    ["zustand/persist", unknown],
    ["zustand/devtools", never],
    ["zustand/immer", never],
  ],
  [],
  MainSliceState
> = (initState) => {
  const initialState = _.merge({}, defaultInitialState, initState);
  return (set, get) => ({
    ...initialState,
    setHasHydrated: () =>
      set({ _hasHydrated: true }, false, "main/setHasHydrated"),
    clearStore: () => {
      set({ ...defaultInitialState }, false, "main/clearStore");
    },
  });
};
